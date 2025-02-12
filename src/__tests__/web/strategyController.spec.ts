import {strategyListHandler} from "../../sockTrader/web/controllers/strategy";

jest.mock("fs");

const MOCK_FILES = ["simpleMovingAverage.js"];

beforeEach(() => require("fs").__setMockFiles(MOCK_FILES));

const mockResponse = () => {
    const res: any = {};
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("strategy listing", () => {
    test("Should return list of all strategy files in base64 encoded format", async () => {
        const res = mockResponse();

        await strategyListHandler(null as any, res, null as any);

        expect(res.send).toBeCalledWith([{
            "id": "c2ltcGxlTW92aW5nQXZlcmFnZQ==",
            "strategy": "simpleMovingAverage",
        }]);
    });
});
