import { Converter } from "./Converters";

export const toIso: Converter<Date, string> = {
    toObj(date: number | string | Date): string {
        return (date) ? new Date(date).toISOString() : undefined;
    },
    fromObj(obj: string) {
        return (obj) ? new Date(obj) : undefined;
    }
};

export const toTimestamp: Converter<Date, number> = {
    toObj(date: number | string | Date): number {
        return (date) ? new Date(date).getTime() : undefined;
    },
    fromObj(obj: number) {
        return (obj) ? new Date(obj) : undefined;
    }
};