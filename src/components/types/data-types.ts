export type CustomField = {
  id: string;
  key: string;
  label: string;
  value: string;
  hidden: boolean;
};

export type Entry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  iconUrl: string | null;
  title: string;
  url: string;
  favourites: boolean;
  login: string;
  password: string;
  loginUpdatedAt: string;
  passwordUpdatedAt: string;
  securityLevel: number;
  customFields: CustomField[];
};

export type Section = {
  id: string;
  createdAt: string;
  name: string;
  entries: Entry[];
  icon: string;
};

export type DataFile = {
  sections: Section[];
};
