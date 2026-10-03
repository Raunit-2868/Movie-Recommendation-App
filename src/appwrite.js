import { Client, ID, Query, TablesDB } from "appwrite";

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID;

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject(PROJECT_ID);

const tablesDB = new TablesDB(client);

export const updateSearchCount = async (searchTerm, movie) => {
  try {
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [Query.equal("searchTerm", searchTerm)],
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];

      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          count: row.count + 1,
        },
      });
    } else {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: {
          searchTerm,
          count: 1,
        },
      });
    }
  } catch (error) {
    console.error("Error updating search count:", error);
  }
};

export const getTrendingMovies = async () => {
  try {
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.orderDesc("count"),
        Query.limit(5),
      ],
    });

    return result.rows;
  } catch (error) {
    console.error("Error getting trending movies:", error);
    return [];
  }
};