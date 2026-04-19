export type ExternalHoliday = {
  date: string;
  name: string;
};

export async function fetchThaiHolidaysFromProvider(
  year: number,
): Promise<ExternalHoliday[]> {
  return [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-02-12`, name: "Makha Bucha Day" },
    { date: `${year}-04-06`, name: "Chakri Memorial Day" },
    { date: `${year}-04-13`, name: "Songkran Festival" },
    { date: `${year}-04-14`, name: "Songkran Festival" },
    { date: `${year}-04-15`, name: "Songkran Festival" },
    { date: `${year}-05-01`, name: "National Labour Day" },
    { date: `${year}-05-05`, name: "Coronation Day" },
    { date: `${year}-05-11`, name: "Visakha Bucha Day" },
    { date: `${year}-06-03`, name: "Queen Suthida's Birthday" },
    { date: `${year}-07-10`, name: "Asarnha Bucha Day" },
    { date: `${year}-07-11`, name: "Buddhist Lent Day" },
    { date: `${year}-07-28`, name: "King Vajiralongkorn's Birthday" },
    { date: `${year}-08-12`, name: "Queen Sirikit's Birthday / Mother's Day" },
    { date: `${year}-10-13`, name: "King Bhumibol Memorial Day" },
    { date: `${year}-10-23`, name: "Chulalongkorn Day" },
    { date: `${year}-12-05`, name: "King Bhumibol's Birthday / Father's Day" },
    { date: `${year}-12-10`, name: "Constitution Day" },
    { date: `${year}-12-31`, name: "New Year's Eve" },
  ];
}