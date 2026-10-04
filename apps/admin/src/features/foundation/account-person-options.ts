import {
  apiErrorStatus,
  type Person,
  type createApiClient,
} from '@lms/api-client';

/** Only a confirmed 404 means that a registered person has no account. */
export async function loadAccountPersonOptions(
  api: ReturnType<typeof createApiClient>,
): Promise<Person[]> {
  const options: Person[] = [];
  const limit = 100;
  for (let page = 1; options.length < limit; page += 1) {
    const people = await api.persons.list({ status: 'ACTIVE', page, limit });
    const candidates = await Promise.all(
      people.data.map(async (person) => {
        try {
          await api.persons.getAccount(person.id);
          return null;
        } catch (error) {
          if (apiErrorStatus(error) === 404) return person;
          throw error;
        }
      }),
    );
    options.push(
      ...candidates.filter((person): person is Person => person !== null),
    );
    if (people.data.length === 0 || page * limit >= people.total) break;
  }
  return options.slice(0, limit);
}
