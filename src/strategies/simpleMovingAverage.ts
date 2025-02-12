import {sma as SMA} from "technicalindicators";
import CandleCollection from "../sockTrader/core/candles/candleCollection";
import logger from "../sockTrader/core/logger";
import {IOrderbook} from "../sockTrader/core/orderbook";
import BaseStrategy from "../sockTrader/core/strategy/baseStrategy";
import {crossDown, crossUp} from "../sockTrader/core/strategy/utils";
import {IExchange} from "../sockTrader/core/types/IExchange";
import {IOrder, OrderStatus} from "../sockTrader/core/types/order";
import {Pair} from "../sockTrader/core/types/pair";

/**
 * Strategy using simple moving average
 * This serves as a demo strategy and is on its own too simplistic
 * for productional use
 */
export default class SimpleMovingAverage extends BaseStrategy {

    inProgress = false;

    constructor(pair: Pair, exchange: IExchange) {
        super(pair, exchange);
    }

    notifyOrder(order: IOrder): void {
        if (order.status === OrderStatus.FILLED) {
            logger.info(`[PT] ORDER: ${JSON.stringify(order)}`);
        }
    }

    updateCandles(candles: CandleCollection): void {
        const closeCandles = candles.close;

        const fastSMA = SMA({period: 12, values: closeCandles, reversedInput: true});
        const slowSMA = SMA({period: 24, values: closeCandles, reversedInput: true});

        const up = crossUp(fastSMA, slowSMA);
        const down = crossDown(fastSMA, slowSMA);

        if (up && !this.inProgress) {
            // current simple moving average line crosses price upward => price falls below SMA
            this.inProgress = true;
            return this.buy(this.pair, candles[0].close, 1);
        }

        if (down && this.inProgress) {
            // current simple moving average line crosses price downward => prices rises above SMA
            this.inProgress = false;
            return this.sell(this.pair, candles[0].close, 1);
        }
    }

    updateOrderbook(orderBook: IOrderbook): void {
        // Ignore method
    }
}
