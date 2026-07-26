"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUserTimezone, detectTimezone } from "./timezone";

const TimezoneContext = createContext<string>(detectTimezone());

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [tz, setTz] = useState(detectTimezone());

  useEffect(() => {
    getUserTimezone().then(setTz);
  }, []);

  return (
    <TimezoneContext.Provider value={tz}>{children}</TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
