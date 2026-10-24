import { addDays, format } from "date-fns";

export const ISO_FORMAT = "yyyy-MM-dd";

export const todayISO = () => format(new Date(), ISO_FORMAT);

/** Latest date accepted from clients. One day of slack covers timezone differences. */
export const maxAllowedDateISO = () => format(addDays(new Date(), 1), ISO_FORMAT);
