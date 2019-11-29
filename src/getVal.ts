import request from "request-promise-native";

let cache: { [key: string]: number } = {};

const ratings: string[] = [
  "newbie",
  "pupil",
  "specialist",
  "expert",
  "candidate master",
  "master",
  "international master",
  "grandmaster",
  "international grandmaster",
  "legendary grandmaster",
];

/**
 *
 * @param rank Number of ranks above newbie
 * @param rating Numerical value for rating
 */
const calculateValue = (rank: number, rating: number): number => {
  return (Math.pow(1.2, rank) * Math.max(0, rating)) / 100;
};

const getVal = async (username: string): Promise<number> => {
  if (cache[username]) return cache[username];

  const data = JSON.parse(await request(`https://codeforces.com/api/user.info?handles=${username}`)).result[0];

  cache[username] = data.rating === undefined ? 0 : calculateValue(ratings.indexOf(data.rank), data.rating);

  return cache[username];
};

/**
 * Resets the rating cache, which will result in updated rating values on the next query of getVal
 */
const resetCache = (): void => {
  cache = {};
};

export { getVal, resetCache };
