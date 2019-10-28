/**
 * Orko
 * Copyright © 2018-2019 Graham Crockford
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package com.gruelbox.orko.exchange;

import static com.gruelbox.orko.exchange.MarketDataType.BALANCE;
import static com.gruelbox.orko.exchange.MarketDataType.OPEN_ORDERS;
import static com.gruelbox.orko.exchange.MarketDataType.ORDERBOOK;
import static com.gruelbox.orko.exchange.MarketDataType.TICKER;
import static com.gruelbox.orko.exchange.MarketDataType.TRADES;
import static java.util.concurrent.TimeUnit.SECONDS;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeoutException;

import org.knowm.xchange.simulated.AccountFactory;
import org.knowm.xchange.simulated.MatchingEngineFactory;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import com.gruelbox.orko.spi.TickerSpec;

/**
 * Stack tests for {@link MarketDataSubscriptionManager} which use the simulated
 * exchange. These can run as part of the main build.
 */
public class TestMarketDataFullStack extends AbstractMarketDataFullStackTest {

  private static final TickerSpec SIMULATED = TickerSpec.builder().base("BTC").counter("USD").exchange(Exchanges.SIMULATED).build();

  private SimulatedOrderBookActivity simulator;
  private AccountFactory accountFactory;
  private MatchingEngineFactory matchingEngineFactory;
  private Map<String, ExchangeConfiguration> exchangeConfiguration;

  @Override
  public void setup() throws TimeoutException {
    accountFactory = new AccountFactory();
    matchingEngineFactory = new MatchingEngineFactory(accountFactory);
    simulator = new SimulatedOrderBookActivity(accountFactory, matchingEngineFactory);
    simulator.startAsync().awaitRunning(30, SECONDS);
    exchangeConfiguration = buildConfig();
    super.setup();
  }

  @Override
  public void tearDown() throws TimeoutException {
    super.tearDown();
    simulator.stopAsync().awaitTerminated(30, SECONDS);
  }

  private Map<String, ExchangeConfiguration> buildConfig() {
    ImmutableMap.Builder<String, ExchangeConfiguration> result = ImmutableMap.builder();
    Exchanges.EXCHANGE_TYPES.get().forEach(clazz -> {
      String name = Exchanges.classToFriendlyName(clazz);
      ExchangeConfiguration exchangeConfiguration = new ExchangeConfiguration();
      exchangeConfiguration.setLoadRemoteData(false);
      if (name.equals(Exchanges.SIMULATED)) {
        exchangeConfiguration.setApiKey("Test");
      }
      result.put(name, exchangeConfiguration);
    });
    return result.build();
  }

  @Override
  protected ExchangeService buildExchangeService() {
    return new ExchangeServiceImpl(exchangeConfiguration,
        accountFactory,
        matchingEngineFactory);
  }

  @Override
  protected Set<MarketDataSubscription> subscriptions() {
    return ImmutableSet.of(
        MarketDataSubscription.create(SIMULATED, TICKER),
        MarketDataSubscription.create(SIMULATED, ORDERBOOK),
        MarketDataSubscription.create(SIMULATED, TRADES),
        MarketDataSubscription.create(SIMULATED, BALANCE),
        MarketDataSubscription.create(SIMULATED, OPEN_ORDERS)
      );
  }

  @Override
  protected MarketDataSubscription ticker() {
    return MarketDataSubscription.create(SIMULATED, TICKER);
  }
}