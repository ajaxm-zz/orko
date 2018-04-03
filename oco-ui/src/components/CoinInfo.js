import React from 'react';

import { Flex, Box } from 'rebass';

import Section from './primitives/Section';
import Warning from './primitives/Warning';
import PriceSet from './primitives/PriceSet';
import Price from './primitives/Price';

export const CoinInfo = props => {

  const coin = props.coin;

  const noBalance = 
      !props.balance
      || !props.balance[coin.base]
      || !props.balance[coin.counter];

  if (coin) {
    return (
      <Section heading={coin.name}>
        <Flex flexWrap='wrap' justifyContent="space-between">
          <Box width={[1/2, 1/4]}>
            {noBalance
              ? <Warning>Cannot fetch balance</Warning>
              : <PriceSet>
                  <Price name={coin.base + " total"} onClick={props.onClickNumber}>{props.balance[coin.base].total}</Price>
                  <Price name={coin.counter + " total"} onClick={props.onClickNumber}>{props.balance[coin.counter].total}</Price>
                </PriceSet>
            }
          </Box>
          <Box width={[1/2, 1/4]}>
            {noBalance
              ? <Warning>Cannot fetch balance</Warning>
              : <PriceSet>
                  <Price name={coin.base + " available"} onClick={props.onClickNumber}>{props.balance[coin.base].available}</Price>
                  <Price name={coin.counter + " available"} onClick={props.onClickNumber}>{props.balance[coin.counter].available}</Price>
                </PriceSet>
            }
          </Box>
          <Box width={[1/2, 1/4]}>
            {(!props.ticker)
              ? <Warning>Cannot fetch ticker</Warning>
              : <PriceSet>
                  <Price name="Bid" onClick={props.onClickNumber}>{props.ticker.bid}</Price>
                  <Price name="Last" onClick={props.onClickNumber}>{props.ticker.last}</Price>
                  <Price name="Ask" onClick={props.onClickNumber}>{props.ticker.ask}</Price>
                </PriceSet>
            }
          </Box>
          <Box width={[1/2, 1/4]}>
            {(!props.ticker)
              ? <Warning>Cannot fetch ticker</Warning>
              : <PriceSet>
                  <Price name="High" onClick={props.onClickNumber}>{props.ticker.high}</Price>
                  <Price name="Open" onClick={props.onClickNumber}>{props.ticker.open}</Price>
                  <Price name="Low" onClick={props.onClickNumber}>{props.ticker.low}</Price>
                </PriceSet>
            }
          </Box>
        </Flex>
      </Section>
    );
  } else {
    return <div>No coin selected</div>;
  }
};

export default CoinInfo;