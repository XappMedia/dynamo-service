import { Converter } from "./Converters";

export const toIso: Converter<Date, string> = {
    toObj(date: Date): string {
        return (date) ? date.toISOString() : undefined;
    },
    fromObj(obj: string) {
        return (obj) ? new Date(obj) : undefined;
    }
};

export const toTimestamp: Converter<Date, number> = {
    toObj(date: Date): number {
        return (date) ? date.getTime() : undefined;
    },
    fromObj(obj: number) {
        return (obj) ? new Date(obj) : undefined;
    }
};