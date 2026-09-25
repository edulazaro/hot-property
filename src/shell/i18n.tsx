import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { OptionSwitch } from "./menu";
import { storage } from "./stage";

export type Locale = "es" | "ca" | "en";

export const LOCALES: Locale[] = ["es", "ca", "en"];

const STORAGE_KEY = "lang";

export const isLocale = (value: unknown): value is Locale => value === "es" || value === "ca" || value === "en";

/** Player's saved choice, else the browser language (English unless es/ca). */
function detectLocale(): Locale {
  const stored = storage.get(STORAGE_KEY);
  if (isLocale(stored)) return stored;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ca")) return "ca";
  if (nav.startsWith("es")) return "es";
  return "en";
}

/**
 * Game locale. A host site can fix it with the `forced` prop, `?lang=` in the URL or
 * `postMessage({ type: "set-locale", locale })` to the iframe; then the player can't change it.
 */
export function useLocale(forced?: Locale) {
  const [fromUrl] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("lang");
    return isLocale(param) ? param : undefined;
  });
  const [fromHost, setFromHost] = useState<Locale>();
  const [chosen, setChosen] = useState(detectLocale);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "set-locale" && isLocale(e.data.locale)) setFromHost(e.data.locale);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const fixed = forced ?? fromHost ?? fromUrl;
  const locale = fixed ?? chosen;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setChosen(next);
    storage.set(STORAGE_KEY, next);
  }, []);

  return { locale, setLocale, canChoose: fixed === undefined };
}

const NAMES: Record<Locale, string> = { es: "Español", ca: "Català", en: "English" };

export function LocaleSwitch({
  locale,
  onChange,
  label,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  label: string;
}): ReactElement {
  return (
    <OptionSwitch
      label={label}
      options={LOCALES.map((l) => ({ value: l, label: NAMES[l] }))}
      value={locale}
      onChange={onChange}
    />
  );
}
