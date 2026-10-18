const directAddressReplacements: Array<[RegExp, string]> = [
  [/\bthe user(?:'s|’s)\b/gi, "your"],
  [/\buser(?:'s|’s)\b/gi, "your"],
  [/\bthe user is\b/gi, "you are"],
  [/\bthe user has\b/gi, "you have"],
  [/\bthe user was\b/gi, "you were"],
  [/\bthe user wants\b/gi, "you want"],
  [/\bthe user prefers\b/gi, "you prefer"],
  [/\bthe user feels\b/gi, "you feel"],
  [/\bthe user felt\b/gi, "you felt"],
  [/\bthe user finds\b/gi, "you find"],
  [/\bthe user appreciates\b/gi, "you appreciate"],
  [/\bthe user aims\b/gi, "you aim"],
  [/\bthe user likes\b/gi, "you like"],
  [/\bthe user loves\b/gi, "you love"],
  [/\bthe user needs\b/gi, "you need"],
  [/\bthe user struggles\b/gi, "you struggle"],
  [/\bthe user recently\b/gi, "you recently"],
  [/\bthe user moved\b/gi, "you moved"],
  [/\buser is\b/gi, "you are"],
  [/\buser has\b/gi, "you have"],
  [/\buser was\b/gi, "you were"],
  [/\buser wants\b/gi, "you want"],
  [/\buser prefers\b/gi, "you prefer"],
  [/\buser feels\b/gi, "you feel"],
  [/\buser felt\b/gi, "you felt"],
  [/\buser finds\b/gi, "you find"],
  [/\buser appreciates\b/gi, "you appreciate"],
  [/\buser aims\b/gi, "you aim"],
  [/\buser likes\b/gi, "you like"],
  [/\buser loves\b/gi, "you love"],
  [/\buser needs\b/gi, "you need"],
  [/\buser struggles\b/gi, "you struggle"],
  [/\buser recently\b/gi, "you recently"],
  [/\buser moved\b/gi, "you moved"],
  [/\band is\b/gi, "and you are"],
  [/\band has\b/gi, "and you have"],
  [/\band was\b/gi, "and you were"],
  [/\band wants\b/gi, "and you want"],
  [/\band prefers\b/gi, "and you prefer"],
  [/\band feels\b/gi, "and you feel"],
  [/\band felt\b/gi, "and you felt"],
  [/\band finds\b/gi, "and you find"],
  [/\band appreciates\b/gi, "and you appreciate"],
  [/\band aims\b/gi, "and you aim"],
  [/\band likes\b/gi, "and you like"],
  [/\band loves\b/gi, "and you love"],
  [/\band needs\b/gi, "and you need"],
  [/\band struggles\b/gi, "and you struggle"],
  [/\band recently\b/gi, "and you recently"],
  [/\band moved\b/gi, "and you moved"],
  [/\bthe user\b/gi, "you"],
];

export function toDirectAddress(text: string): string {
  const result = directAddressReplacements
    .reduce((result, [pattern, replacement]) => {
      return result.replace(pattern, (match) =>
        match[0] === match[0].toUpperCase()
          ? replacement[0].toUpperCase() + replacement.slice(1)
          : replacement,
      );
    }, text)
    .replace(/\buser\b/gi, (match) =>
      match[0] === match[0].toUpperCase() ? "You" : "you",
    );
  return result.replace(/(^|[.!?]\s+)(you)\b/g, "$1You");
}

export function toDirectAddressValue(value: unknown): unknown {
  if (typeof value === "string") return toDirectAddress(value);
  if (Array.isArray(value)) return value.map(toDirectAddressValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        toDirectAddressValue(nested),
      ]),
    );
  }
  return value;
}
