import {testFn} from "@/main";

it("Can add normally", async () => {
    const result = testFn(1, 2)
    expect(result).toBe(3)
})