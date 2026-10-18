import { describe, expect, it } from "vitest";
import { toDirectAddress, toDirectAddressValue } from "@/lib/personLanguage";

describe("toDirectAddress", () => {
  it("rewrites third-person memory phrasing into direct address", () => {
    expect(
      toDirectAddress("The user has a goal. Aisha is the user's friend."),
    ).toBe("You have a goal. Aisha is your friend.");
    expect(
      toDirectAddress("The user recently moved and prefers gentle replies."),
    ).toBe("You recently moved and you prefer gentle replies.");
  });

  it("normalizes nested graph properties without changing non-string values", () => {
    expect(
      toDirectAddressValue({
        text: "The user loves quiet mornings.",
        properties: ["The user's goal", 4],
      }),
    ).toEqual({
      text: "You love quiet mornings.",
      properties: ["Your goal", 4],
    });
  });
});
