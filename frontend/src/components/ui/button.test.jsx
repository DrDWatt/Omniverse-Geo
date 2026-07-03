import React from "react";
import { render, screen } from "@testing-library/react";

import { Button } from "./button";

test("renders a shadcn-style button", () => {
  render(<Button>Track</Button>);

  expect(screen.getByRole("button", { name: "Track" })).toBeInTheDocument();
});
