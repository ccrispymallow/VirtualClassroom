// /* global describe, test, expect */
import { test, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom"; // Essential for .toHaveTextContent
import App from "../src/App.jsx";

test("button increments when clicked", () => {
  render(<App />);

  // 1. Find the button
  const button = screen.getByRole("button");

  // 2. Click it
  fireEvent.click(button);

  // 3. Verify it changed
  expect(button).toHaveTextContent("count is 1");
});
