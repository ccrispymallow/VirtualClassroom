export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/unit/**/*.test.js"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "html"],
  collectCoverageFrom: ["src/controllers/**/*.js", "src/services/**/*.js"],
};
