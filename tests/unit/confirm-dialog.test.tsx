// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/confirm-dialog";

afterEach(cleanup);

function setup(onConfirm: () => void | Promise<void>) {
  render(
    <ConfirmDialog
      title="Delete this thing?"
      description="It cannot be undone."
      confirmLabel="Delete thing"
      destructive
      onConfirm={onConfirm}
      trigger={<button type="button">Delete</button>}
    />,
  );
}

describe("ConfirmDialog", () => {
  it("does nothing until the question is confirmed", () => {
    const onConfirm = vi.fn();
    setup(onConfirm);
    // Clicking the trigger only asks.
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Delete this thing?")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not run the action on Cancel", async () => {
    const onConfirm = vi.fn();
    setup(onConfirm);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("runs the action once on confirm, then closes", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    setup(onConfirm);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("stays open and ignores a second tap while the action is running", async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    setup(onConfirm);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete thing" }));
    fireEvent.click(screen.getByRole("button", { name: "Working" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
