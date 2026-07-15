export const isValidUrl = (value: string) => {
  const regex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
  return regex.test(value);
};
