import { jest } from "@jest/globals";

const mockCreateUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetUserById = jest.fn();
const mockLogin = jest.fn();
const mockUpdateUser = jest.fn();

await jest.unstable_mockModule("../../../src/services/user.service.js", () => ({
  createUser: mockCreateUser,
  getAllUsers: mockGetAllUsers,
  getUserById: mockGetUserById,
  login: mockLogin,
  updateUser: mockUpdateUser,
}));

const { registerUser, getAllUsers, getUserById, loginUser, updateUser } =
  await import("../../../src/controllers/user.controller.js");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

afterEach(() => jest.clearAllMocks());

describe("registerUser", () => {
  test("should return 201 with created user on valid input", async () => {
    const req = {
      body: {
        username: "panchaya",
        email: "p@example.com",
        password: "Pass1234",
        role: "student",
      },
    };
    const res = mockRes();
    const mockUser = {
      id: 1,
      username: "panchaya",
      email: "p@example.com",
      role: "student",
    };
    mockCreateUser.mockResolvedValue(mockUser);

    await registerUser(req, res, mockNext);

    expect(mockCreateUser).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "User created successfully",
      user: mockUser,
    });
  });

  test("should return 400 when required fields are missing", async () => {
    const req = { body: { username: "panchaya" } };
    const res = mockRes();

    await registerUser(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "username, email, password and role are required",
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  test("should call next(error) when service throws", async () => {
    const req = {
      body: { username: "x", email: "x@x.com", password: "p", role: "student" },
    };
    const res = mockRes();
    const err = new Error("DB error");
    mockCreateUser.mockRejectedValue(err);

    await registerUser(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(err);
  });
});

describe("getAllUsers", () => {
  test("should return list of users", async () => {
    const req = {};
    const res = mockRes();
    const mockUsers = [
      { id: 1, username: "panchaya", email: "a@a.com", role: "student" },
      { id: 2, username: "piraya", email: "b@b.com", role: "instructor" },
    ];
    mockGetAllUsers.mockResolvedValue(mockUsers);

    await getAllUsers(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(mockUsers);
  });

  test("should call next(error) on failure", async () => {
    const req = {};
    const res = mockRes();
    mockGetAllUsers.mockRejectedValue(new Error("Query failed"));

    await getAllUsers(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe("getUserById", () => {
  test("should return user when found", async () => {
    const req = { params: { id: "1" } };
    const res = mockRes();
    const mockUser = { id: 1, username: "panchaya", avatar: "female" };
    mockGetUserById.mockResolvedValue(mockUser);

    await getUserById(req, res, mockNext);

    expect(mockGetUserById).toHaveBeenCalledWith("1");
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  test("should return 404 when user not found", async () => {
    const req = { params: { id: "999" } };
    const res = mockRes();
    mockGetUserById.mockResolvedValue(null);

    await getUserById(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });
});

describe("loginUser", () => {
  test("should return user on successful login", async () => {
    const req = { body: { email: "a@a.com", password: "Pass1234" } };
    const res = mockRes();
    const mockUser = {
      id: 1,
      email: "a@a.com",
      password: "Pass1234",
      role: "student",
    };
    mockLogin.mockResolvedValue(mockUser);

    await loginUser(req, res, mockNext);

    expect(mockLogin).toHaveBeenCalledWith("a@a.com");
    expect(res.json).toHaveBeenCalledWith({
      message: "Login successful",
      user: mockUser,
    });
  });

  test("should return 401 when password is incorrect", async () => {
    const req = { body: { email: "a@a.com", password: "WrongPass" } };
    const res = mockRes();
    mockLogin.mockResolvedValue({
      id: 1,
      email: "a@a.com",
      password: "CorrectPass",
    });

    await loginUser(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid email or password",
    });
  });

  test("should return 401 when user does not exist", async () => {
    const req = { body: { email: "nobody@x.com", password: "any" } };
    const res = mockRes();
    mockLogin.mockResolvedValue(null);

    await loginUser(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid email or password",
    });
  });
});

describe("updateUser", () => {
  test("should return updated user on success", async () => {
    const req = {
      params: { id: "1" },
      body: { username: "new_name", avatar: "male" },
    };
    const res = mockRes();
    const mockUpdated = { id: 1, username: "new_name", avatar: "male" };
    mockUpdateUser.mockResolvedValue(mockUpdated);

    await updateUser(req, res, mockNext);

    expect(mockUpdateUser).toHaveBeenCalledWith("1", {
      username: "new_name",
      avatar: "male",
    });
    expect(res.json).toHaveBeenCalledWith({
      message: "User updated successfully",
      user: mockUpdated,
    });
  });

  test("should return 400 if neither username nor avatar provided", async () => {
    const req = { params: { id: "1" }, body: {} };
    const res = mockRes();

    await updateUser(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "At least username or avatar is required to update",
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("should return 404 if user not found", async () => {
    const req = { params: { id: "999" }, body: { username: "ghost" } };
    const res = mockRes();
    mockUpdateUser.mockResolvedValue(null);

    await updateUser(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });
});
