import { jest } from "@jest/globals";

// ─── 1. Define mock ────────────────────────────────────────────
const mockQuery = jest.fn();

// ─── 2. Register mock BEFORE importing anything ────────────────
await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

// ─── 3. Dynamic import AFTER mocking ───────────────────────────
const { createUser, getAllUsers, getUserById, login, updateUser } =
  await import("../../../src/services/user.service.js");

afterEach(() => jest.clearAllMocks());

// ──────────────────────────────────────────────────────────────
// createUser
// ──────────────────────────────────────────────────────────────
describe("createUser", () => {
  test("1. should insert user and return the created row", async () => {
    // Arrange
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

    // Act
    const result = await createUser(userData);

    // Assert
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockRow);
  });

  test("2. should throw when DB query fails", async () => {
    // Arrange
    mockQuery.mockRejectedValue(new Error("DB error"));

    // Act & Assert
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

// ──────────────────────────────────────────────────────────────
// getAllUsers
// ──────────────────────────────────────────────────────────────
describe("getAllUsers", () => {
  test("1. should return all user rows", async () => {
    // Arrange
    const mockRows = [
      { id: 1, username: "panchaya" },
      { id: 2, username: "piraya" },
    ];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await getAllUsers();

    // Assert
    expect(result).toEqual(mockRows);
  });

  test("2. should return empty array when no users exist", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await getAllUsers();

    // Assert
    expect(result).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────
// getUserById
// ──────────────────────────────────────────────────────────────
describe("getUserById", () => {
  test("1. should return user when found", async () => {
    // Arrange
    const mockRow = { id: 1, username: "panchaya", avatar: "female" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await getUserById(1);

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [1]);
    expect(result).toEqual(mockRow);
  });

  test("2. should return undefined when user not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await getUserById(999);

    // Assert
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// login
// ──────────────────────────────────────────────────────────────
describe("login", () => {
  test("1. should return user row including password for comparison", async () => {
    // Arrange
    const mockRow = {
      id: 1,
      email: "p@example.com",
      password: "hashed",
      role: "student",
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await login("p@example.com");

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "p@example.com",
    ]);
    expect(result).toEqual(mockRow);
  });

  test("2. should return undefined when email not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await login("nobody@x.com");

    // Assert
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// updateUser
// ──────────────────────────────────────────────────────────────
describe("updateUser", () => {
  test("1. should update username only (no avatar) and return user", async () => {
    // Arrange
    const mockRow = {
      id: 1,
      username: "new_name",
      email: "p@example.com",
      role: "student",
      avatar_id: null,
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await updateUser(1, { username: "new_name", avatar: null });

    // Assert
    expect(result.username).toBe("new_name");
    expect(result.avatar_id).toBeUndefined();
  });

  test("2. should return null when user not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await updateUser(999, { username: "ghost" });

    // Assert
    expect(result).toBeNull();
  });

  test("3. should use existing avatar_id when avatar name already exists in DB", async () => {
    // Arrange
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 7 }] }) // SELECT avatar → found
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
      }) // UPDATE user
      .mockResolvedValueOnce({ rows: [{ name: "female" }] }); // SELECT avatar name

    // Act
    const result = await updateUser(1, {
      username: "panchaya",
      avatar: "female",
    });

    // Assert
    expect(result.avatar).toBe("female");
    expect(result.avatar_id).toBeUndefined();
  });

  test("4. should insert new avatar when avatar name not in DB yet", async () => {
    // Arrange
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // SELECT avatar → not found
      .mockResolvedValueOnce({ rows: [{ id: 9 }] }) // INSERT avatar → new id
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
      }) // UPDATE user
      .mockResolvedValueOnce({ rows: [{ name: "male" }] }); // SELECT avatar name

    // Act
    const result = await updateUser(1, {
      username: "panchaya",
      avatar: "male",
    });

    // Assert
    expect(result.avatar).toBe("male");
    expect(result.avatar_id).toBeUndefined();
  });
});
