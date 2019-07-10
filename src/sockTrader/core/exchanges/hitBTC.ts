import crypto from "crypto";
import nanoid from "nanoid";
import {ICandle, ICandleInterval} from "../candles/candleManager";
import logger from "../logger";
import Orderbook from "../orderbook";
import {IOrder, OrderSide} from "../types/order";
import {Pair} from "../types/pair";
import BaseExchange, {IOrderbookData, IResponseAdapter} from "./baseExchange";
import HitBTCAdapter from "./hitBTCAdapter";
import {Data} from "../connection/webSocket";

export const CandleInterval: Record<string, ICandleInterval> = {
    ONE_MINUTE: {code: "M1", cron: "00 */1 * * * *"},
    THREE_MINUTES: {code: "M3", cron: "00 */3 * * * *"},
    FIVE_MINUTES: {code: "M5", cron: "00 */5 * * * *"},
    FIFTEEN_MINUTES: {code: "M15", cron: "00 */15 * * * *"},
    THIRTY_MINUTES: {code: "M30", cron: "00 */30 * * * *"},
    ONE_HOUR: {code: "H1", cron: "00 00 */1 * * *"},
    FOUR_HOURS: {code: "H4", cron: "00 00 2,6,10,14,18,22 * * *"},
    ONE_DAY: {code: "D1", cron: "00 00 00 */1 * *"},
    SEVEN_DAYS: {code: "D7", cron: "00 00 00 */7 * *"},
    ONE_MONTH: {code: "1M", cron: "00 00 00 00 */1 *"},
};

/**
 * The HitBTC class represent the HitBTC exchange
 * @see https://hitbtc.com/
 */
export default class HitBTC extends BaseExchange {

    readonly pingInterval: number = 40 * 1000;
    readonly adapter: IResponseAdapter = new HitBTCAdapter(this);
    private static instance?: HitBTC;

    /**
     * Creates a new HitBTC exchange
     * @param {string} pubKey the public key for connecting
     * @param {string} secKey the secret key for connecting
     */
    constructor(private readonly pubKey = "", private readonly secKey = "") {
        super("wss://api.hitbtc.com/api/2/ws");
    }

    /**
     * Creates a singleton instance of HitBTC
     * @param {string} pKey public key
     * @param {string} sKey secret key
     * @returns {HitBTC} HitBTC instance
     */
    static getInstance(pKey = "", sKey = "") {
        if (!HitBTC.instance) {
            HitBTC.instance = new HitBTC(pKey, sKey);
        }
        return HitBTC.instance;
    }

    adjustOrder(order: IOrder, price: number, qty: number): void {
        if (this.isAdjustingAllowed(order, price, qty)) {
            const newOrderId = this.generateOrderId(order.pair);

            this.send("cancelReplaceOrder", {
                clientOrderId: order.id,
                price,
                quantity: qty,
                requestClientId: newOrderId,
                strictValidate: true,
            });
        }
    }

    cancelOrder(order: IOrder): void {
        this.setOrderInProgress(order.id);
        this.send("cancelOrder", {clientOrderId: order.id});
    }

    createOrder(pair: Pair, price: number, qty: number, side: OrderSide): void {
        const orderId = this.generateOrderId(pair);
        this.setOrderInProgress(orderId);

        logger.info(`${side.toUpperCase()} ORDER! PRICE: ${price} SIZE: ${qty}`);
        this.send("newOrder", {
            clientOrderId: orderId,
            price,
            quantity: qty,
            side,
            symbol: pair,
            type: "limit",
        });
    }

    loadCurrencies(): void {
        this.send("getSymbols");
    }

    /**
     * Authenticates user on exchange using secure signed nonce
     * @param publicKey the public key
     * @param privateKey the private key
     */
    login(publicKey: string, privateKey: string): void {
        const nonce: string = nanoid(32);
        const signature: string = crypto.createHmac("sha256", privateKey).update(nonce).digest("hex");

        this.send("login", {
            algo: "HS256",
            nonce,
            pKey: publicKey,
            signature,
        });
    }

    onSnapshotCandles = (pair: Pair, data: ICandle[], interval: ICandleInterval) => this
        .getCandleManager(pair, interval, candles => this.emit("core.updateCandles", candles))
        .set(data);

    onUpdateCandles = (pair: Pair, data: ICandle[], interval: ICandleInterval) => this
        .getCandleManager(pair, interval, candles => this.emit("core.updateCandles", candles))
        .update(data);

    onSnapshotOrderbook({pair, ask, bid, sequence}: IOrderbookData) {
        const orderbook: Orderbook = this.getOrderbook(pair);
        orderbook.setOrders(ask, bid, sequence);

        this.emit("core.snapshotOrderbook", orderbook);
    }

    onUpdateOrderbook({pair, ask, bid, sequence}: IOrderbookData) {
        const orderbook: Orderbook = this.getOrderbook(pair);
        orderbook.addIncrement(ask, bid, sequence);

        this.emit("core.updateOrderbook", orderbook);
    }

    subscribeCandles(pair: Pair, interval: ICandleInterval): void {
        return this.send("subscribeCandles", {
            symbol: pair.join(""),
            period: interval.code,
        });
    }

    subscribeOrderbook = (pair: Pair): void => this.send("subscribeOrderbook", {symbol: pair.join("")});

    subscribeReports = (): void => this.send("subscribeReports");

    protected onFirstConnect(): void {
        super.onFirstConnect();

        this.getConnection().on("message", (data: Data) => this.adapter.onReceive(data));
        this.loadCurrencies();

        if (this.pubKey !== "" && this.secKey !== "") {
            logger.info("Live credentials are used!");
            this.login(this.pubKey, this.secKey);
        }
    }
}
