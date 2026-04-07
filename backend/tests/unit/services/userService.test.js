import { jest } from "@jest/globals";

const mockQuery = jest.fn();

await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

const { createUser, getAllUsers, getUserById, login, updateUser } =
  await import("../../../src/services/user.service.js");

afterEach(() => jest.clearAllMocks());

describe("createUser", () => {
  test("should insert user and return the created row", async () => {
    const userData = {
      username: "panchaya",
      email: "p@example.com",
      password: "Pass1",
      role: "student",
    };
    const mockRow = {
      id: 1,
      username: "panchaya",
      email: "p@example.com",
      role: "student",
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await createUser(userData);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockRow);
  });

  test("should throw when DB query fails", async () => {
    mockQuery.mockRejectedValue(new Error("DB error"));

    await expect(
      createUser({
        username: "x",
        email: "x@x.com",
        password: "p",
        role: "student",
      }),
    ).rejects.toThrow("DB error");
  });
});

describe("getAllUsers", () => {
  test("should return all user rows", async () => {
    const mockRows = [
      { id: 1, username: "panchaya" },
      { id: 2, username: "piraya" },
    ];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await getAllUsers();

    expect(result).toEqual(mockRows);
  });

  test("should return empty array when no users exist", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await getAllUsers();

    expect(result).toEqual([]);
  });
});

describe("getUserById", () => {
  test("should return user when found", async () => {
    const mockRow = { id: 1, username: "panchaya", avatar: "female" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await getUserById(1);

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [1]);
    expect(result).toEqual(mockRow);
  });

  test("should return undefined when user not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await getUserById(999);

    expect(result).toBeUndefined();
  });
});

describe("login", () => {
  test("should return user row including password for comparison", async () => {
    const mockRow = {
      id: 1,
      email: "p@example.com",
      password: "hashed",
      role: "student",
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await login("p@example.com");

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "p@example.com",
    ]);
    expect(result).toEqual(mockRow);
  });

  test("should return undefined when email not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await login("nobody@x.com");

    expect(result).toBeUndefined();
  });
});

describe("updateUser", () => {
  test("should update username only (no avatar) and return user", async () => {
    const mockRow = {
      id: 1,
      username: "new_name",
      email: "p@example.com",
      role: "student",
      avatar_id: null,
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await updateUser(1, { username: "new_name", avatar: null });

    expect(result.username).toBe("new_name");
    expect(result.avatar_id).toBeUndefined();
  });

  test("should return null when user not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await updateUser(999, { username: "ghost" });

    expect(result).toBeNull();
  });

  test("should use existing avatar_id when avatar name already exists in DB", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            username: "panchaya",
            email: "p@example.com",
            role: "student",
            avatar_id: 7,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: "female" }] });

    const result = await updateUser(1, {
      username: "panchaya",
      avatar: "female",
    });

    expect(result.avatar).toBe("female");
    expect(result.avatar_id).toBeUndefined();
  });

  test("should insert new avatar when avatar name not in DB yet", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            username: "panchaya",
            email: "p@example.com",
            role: "student",
            avatar_id: 9,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: "male" }] });

    const result = await updateUser(1, {
      username: "panchaya",
      avatar: "male",
    });

    expect(result.avatar).toBe("male");
    expect(result.avatar_id).toBeUndefined();
  });
});
