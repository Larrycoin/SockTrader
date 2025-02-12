import fs from "fs-extra";
import path from "path";
import util from "util";
import CandleNormalizer from "./candleNormalizer";

const resolver = (root: string) => (folder: string, file = "") => path.resolve(__dirname, root, folder, file);
const buildPath = resolver("../../../build");

/**
 * Parse candles from candleNormalizer into a serializable array
 * @param candleNormalizer
 */
export const normalizeCandles = async (candleNormalizer: CandleNormalizer): Promise<any> => candleNormalizer.normalize();

/**
 * Normalize a single file in the "build/data" folder
 * @param file
 */
export const normalizeDataFile = async (file: string): Promise<void> => normalizeDataFiles([file]);

/**
 * Import multiple JavaScript files from the "build/data" folder and store
 * the parsed result of each file into a JSON file. This resulting JSON file
 * should be consumable by the frontend and the BackTesting engine.
 * @param files
 */
export async function normalizeDataFiles(files: string[]): Promise<void> {
    for (const file of files) {
        try {
            const baseFileName = path.basename(file, path.extname(file));
            const candleNormalizer: CandleNormalizer = (await import(buildPath("data", file))).default;
            const data = await normalizeCandles(candleNormalizer);

            await fs.writeJSON(buildPath("data", `${baseFileName}.json`), data);
        } catch (e) {
            console.error(e);
        }
    }
}

/**
 * Normalizes all the files in the "build/data" folder
 */
export async function normalizeDataFolder(): Promise<void> {
    const readDir = util.promisify(fs.readdir);
    const files = await readDir(buildPath("data")) as string[];
    const jsFiles = files.filter(file => path.extname(file) === ".js");

    return normalizeDataFiles(jsFiles);
}
