import * as userService from "../services/user.service.js";

//POST
export const registerUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        error: "username, email, password and role are required",
      });
    }

    const user = await userService.createUser({
      username,
      email,
      password,
      role,
    });

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

//GET AllUser
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

//GET user
export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await userService.login(email);

    if (!user || user.password !== password) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    res.json({
      message: "Login successful",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// PUT
export const updateUser = async (req, res, next) => {
  try {
    const { username, avatar } = req.body;
    const userId = req.params.id;

    if (!username && !avatar) {
      return res.status(400).json({
        error: "At least username or avatar is required to update",
      });
    }

    const updatedUser = await userService.updateUserProfile(userId, {
      username,
      avatar,
    });

    if (!updatedUser) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
