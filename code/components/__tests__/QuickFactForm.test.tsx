import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import QuickFactForm from "../QuickFactForm";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  generateQuickFactInspiration: vi.fn(),
}));

describe("QuickFactForm", () => {
  const defaultProps = {
    projectTitle: "Test Project",
    artifacts: [],
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  it("renders correctly", () => {
    render(<QuickFactForm {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /Save fact/i }),
    ).toBeInTheDocument();
  });

  it("displays loading state when isSubmitting is true", () => {
    render(<QuickFactForm {...defaultProps} isSubmitting={true} />);

    // This assertion is expected to fail before implementation
    expect(
      screen.getByRole("button", { name: /Saving.../i }),
    ).toBeInTheDocument();
    // Also check that it is disabled
    expect(screen.getByRole("button", { name: /Saving.../i })).toBeDisabled();
  });
});
