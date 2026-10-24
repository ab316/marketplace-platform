export type Clock = {
  now(): Date;
};

export type IdGenerator = {
  next(): string;
};
