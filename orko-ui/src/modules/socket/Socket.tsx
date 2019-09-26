/*
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
import React, { useEffect, ReactElement, useContext, useState, useMemo, useRef, useCallback } from "react"

import { AuthContext } from "@orko-ui-auth/index"
import { LogContext, LogRequest } from "@orko-ui-log/index"

import * as coinActions from "../../store/coin/actions"
import * as socketClient from "./socket.client"
import { locationToCoin } from "../../selectors/coins"
import { batchActions } from "redux-batched-actions"
import { useInterval } from "@orko-ui-common/util/hookUtils"
import { SocketContext, SocketApi } from "./SocketContext"
import { Coin } from "@orko-ui-market/index"
import { Map } from "immutable"
import { Ticker, Balance } from "./Types"

const ACTION_KEY_ORDERBOOK = "orderbook"
const ACTION_KEY_BALANCE = "balance"

export interface SocketProps {
  store
  children: ReactElement
}

/**
 * Manages the socket, disconnecting when authentication is lost and
 * reconnecting when enabled, and then dispatching any updates to
 * the store.
 *
 * This is an interim measure as I break up the redux store and switch
 * to individual contexts, as has now been done for this and Authoriser.
 *
 * @param props
 */
export const Socket: React.FC<SocketProps> = (props: SocketProps) => {
  //////////////////////// SOCKET STATE ////////////////////////////

  // Contexts required
  const authApi = useContext(AuthContext)
  const logApi = useContext(LogContext)

  // Connection state
  const [connected, setConnected] = useState(false)

  //////////////////////// MARKET DATA /////////////////////////////

  // Data from the socket
  const [tickers, setTickers] = useState(Map<String, Ticker>())
  const [balances, setBalances] = useState(Map<String, Balance>())

  /////////////////////// NON-STATE DATA ///////////////////////////

  const deduplicatedActionBuffer = useRef<object>()
  useEffect(() => {
    deduplicatedActionBuffer.current = {}
  }, [])

  const allActionBuffer = useRef<Array<object>>()
  useEffect(() => {
    allActionBuffer.current = []
  }, [])

  function bufferLatestAction(key: string, action: object) {
    deduplicatedActionBuffer.current[key] = action
  }

  function bufferAllActions(action: object) {
    allActionBuffer.current.push(action)
  }

  function clearActionsForPrefix(prefix: string) {
    // eslint-disable-next-line
    for (const key of Object.keys(deduplicatedActionBuffer.current)) {
      if (key.startsWith(prefix)) delete deduplicatedActionBuffer.current[key]
    }
  }

  // Buffer and dispatch as a batch all the redux actions from the socket once a second
  // TODO consider a non-redux equivalent
  useInterval(() => {
    const batch = Object.values(deduplicatedActionBuffer.current).concat(allActionBuffer)
    if (batch.length > 0) {
      deduplicatedActionBuffer.current = {}
      allActionBuffer.current = []
      props.store.dispatch(batchActions(batch))
    }
  }, 1000)

  /////////////////////// SOCKET MANAGEMENT ///////////////////////////

  const subscribedCoins = useCallback(() => props.store.getState().coins.coins, [props.store])
  const getSelectedCoin = useCallback(() => locationToCoin(props.store.getState().router.location), [
    props.store
  ])

  const location = props.store.getState().router.location
  const selectedCoin = useMemo(() => locationToCoin(location), [location])
  const selectedCoinTicker = useMemo(() => (selectedCoin ? tickers.get(selectedCoin.key) : null), [
    tickers,
    selectedCoin
  ])

  // Forward notifications/errors to the log API
  const logError = logApi.localError
  const logMessage = logApi.localMessage
  const logNotification = logApi.add
  useEffect(() => {
    socketClient.onError((message: string) => logError(message))
    socketClient.onNotification((logEntry: LogRequest) => logNotification(logEntry))
  }, [props.store, logError, logNotification])

  // Dispatch market data to the store
  useEffect(() => {
    const sameCoin = (left: Coin, right: Coin) => left && right && left.key === right.key
    socketClient.onTicker((coin: Coin, ticker: Ticker) =>
      setTickers(tickers => tickers.set(coin.key, ticker))
    )
    socketClient.onBalance((exchange: string, currency: string, balance: Balance) => {
      const coin = getSelectedCoin()
      if (coin && coin.exchange === exchange) {
        if (coin.base === currency) {
          setBalances(balances => Map.of(currency, balance, coin.counter, balances.get(coin.counter)))
        }
        if (coin.counter === currency) {
          setBalances(balances => Map.of(currency, balance, coin.base, balances.get(coin.base)))
        }
      }
    })
    socketClient.onOrderBook((coin: Coin, orderBook) => {
      if (sameCoin(coin, getSelectedCoin()))
        bufferLatestAction(ACTION_KEY_ORDERBOOK, coinActions.setOrderBook(orderBook))
    })
    socketClient.onTrade((coin: Coin, trade) => {
      if (sameCoin(coin, getSelectedCoin())) bufferAllActions(coinActions.addTrade(trade))
    })
    socketClient.onUserTrade((coin: Coin, trade) => {
      if (sameCoin(coin, getSelectedCoin())) bufferAllActions(coinActions.addUserTrade(trade))
    })
    socketClient.onOrderUpdate((coin: Coin, order, timestamp) => {
      if (sameCoin(coin, getSelectedCoin())) props.store.dispatch(coinActions.orderUpdated(order, timestamp))
    })

    // This is a bit hacky. The intent is to move this logic server side,
    // so the presence of a snapshot/poll loop is invisible to the client.
    // In the meantime, I'm not polluting the reducer with it.
    socketClient.onOrdersSnapshot((coin: Coin, orders, timestamp) => {
      if (sameCoin(coin, getSelectedCoin())) {
        var idsPresent = []
        if (orders.length === 0) {
          // Update that there are no orders
          props.store.dispatch(coinActions.orderUpdated(null, timestamp))
        } else {
          // Updates for every order mentioned
          orders.forEach(o => {
            idsPresent.push(o.id)
            props.store.dispatch(coinActions.orderUpdated(o, timestamp))
          })
        }

        // Any order not mentioned should be removed
        if (props.store.getState().coin.orders) {
          props.store
            .getState()
            .coin.orders.filter(o => !idsPresent.includes(o.id))
            .forEach(o => {
              props.store.dispatch(coinActions.orderUpdated({ id: o.id, status: "CANCELED" }, timestamp))
            })
        }
      }
    })
  }, [props.store, getSelectedCoin])

  // Connect the socket when authorised, and disconnect when deauthorised
  useEffect(() => {
    if (authApi.authorised) {
      socketClient.connect()
    }
    return () => socketClient.disconnect()
  }, [authApi.authorised])

  // Sync the state of the socket with the socket itself
  useEffect(() => {
    socketClient.onConnectionStateChange((newState: boolean) => setConnected(newState))
  }, [setConnected])

  // Log when the socket connects and resubscribe
  const resubscribe = useCallback(() => {
    socketClient.changeSubscriptions(subscribedCoins(), getSelectedCoin())
    socketClient.resubscribe()
  }, [subscribedCoins, getSelectedCoin])
  useEffect(() => {
    if (connected) {
      logMessage("Socket connected")
      resubscribe()
      return () => logMessage("Socket disconnected")
    }
  }, [connected, logMessage, resubscribe])

  // When the coin selected changes, send resubscription messages and clear any
  // coin-specific state
  useEffect(() => {
    console.log("Resubscribing following coin change")
    socketClient.changeSubscriptions(subscribedCoins(), selectedCoin)
    socketClient.resubscribe()
    clearActionsForPrefix(ACTION_KEY_BALANCE)
    bufferLatestAction(ACTION_KEY_ORDERBOOK, coinActions.setOrderBook(null))
    bufferAllActions(coinActions.clearUserTrades())
    props.store.dispatch(coinActions.clearOrders())
    bufferAllActions(coinActions.clearTrades())
    bufferAllActions(coinActions.clearBalances())
  }, [props.store, connected, subscribedCoins, selectedCoin])

  const api: SocketApi = useMemo(() => ({ connected, resubscribe, tickers, balances, selectedCoinTicker }), [
    connected,
    resubscribe,
    tickers,
    balances,
    selectedCoinTicker
  ])

  return <SocketContext.Provider value={api}>{props.children}</SocketContext.Provider>
}
