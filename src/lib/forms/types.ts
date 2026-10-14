export type FormResponse = {
  error?: string;
  fields?: Record<string, string>;
  errors?: Record<string, string | undefined>;
  success?: string;
  destination?: string;
  message?: string;
};
