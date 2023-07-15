import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function omitText(str: string) {
  return str && str.replace(/^(.{4})(.*)(.{4})$/, '$1...$3')
}