import { GetServerSideProps } from 'next';
import { DatePicker, Input, Table } from 'antd';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
const { Search } = Input;
const { RangePicker } = DatePicker;
type RangeValue = [Dayjs | null, Dayjs | null] | null;

interface IAccountProps {
  inputTxs: Array<ITxRow>;
  outputTxs: Array<ITxRow>;
}

interface ITxRow {
  key: string;
  symbol: string;
  address: string;
  amount: number;
  count: string;
}

interface IAccountDetailResponse {
  data: IAccData
}

interface IAccData {
  flow: IAccFlow
}

interface IAccFlow {
  inputs: Array<IAccTx>;
  outputs: Array<IAccTx>;
}

interface IAccTx {
  amount: number;
  count: string;
  currency: IAccCurrency;
}

interface IAccCurrency {
  address: string;
  symbol: string;
}

export default function Home({ inputTxs, outputTxs }: IAccountProps) {
  const router = useRouter();
  const { address, startDate, endDate } = router.query;
  const dateFormat = 'YYYY-MM-DD';

  const [inputAddress, SetInputAddress] = useState('0xa61efc2d53ae7035');
  const [dates, setDates] = useState<RangeValue>(null);

  const columns = [
    {
      title: 'Currency',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: 'Smart Contract Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
    }
  ];

  useEffect(() => {
    if (startDate && endDate) {
      setDates([dayjs(startDate as string, dateFormat), dayjs(endDate as string, dateFormat)]);
    }
  }, [startDate, endDate]);

  const onSearch = (addr: string) => {
    const startDate = dayjs(dates?.[0]).format(dateFormat);
    const endDate = dayjs(dates?.[1]).format(dateFormat);
    router.push(`/?address=${addr}&startDate=${startDate}&endDate=${endDate}`);
    SetInputAddress(addr);
  }

  return (
    <div className='home-container'>
      <Search placeholder="input address" defaultValue={address ? address : inputAddress} onSearch={onSearch} />
      <RangePicker format={dateFormat}
        defaultValue={dates !== null ? [dayjs(dates?.[0], dateFormat), dayjs(dates?.[1], dateFormat)] :
          startDate ? [dayjs(startDate as string, dateFormat), dayjs(endDate as string, dateFormat)] : null}
        onCalendarChange={(val) => setDates(val)} />
      <br />
      <span>Currencies Send:</span><br />
      <Table dataSource={inputTxs} columns={columns}
        onRow={(record, rowIndex) => {
          return {
            onClick: (event) => {
              const sDate = dayjs(dates?.[0]).format(dateFormat);
              const eDate = dayjs(dates?.[1]).format(dateFormat);
              router.push(`/transaction?address=${inputAddress}&startDate=${sDate}&endDate=${eDate}&symbol=${record.symbol}&directionType=inputs`);
            }
          };
        }} />
      <br />
      <span>Currencies received:</span><br />
      <Table dataSource={outputTxs} columns={columns}
        onRow={(record, rowIndex) => {
          return {
            onClick: (event) => {
              const sDate = dayjs(dates?.[0]).format(dateFormat);
              const eDate = dayjs(dates?.[1]).format(dateFormat);
              router.push(`/transaction?address=${inputAddress}&startDate=${sDate}&endDate=${eDate}&symbol=${record.symbol}&directionType=outputs`);
            }
          };
        }} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query: { address, startDate, endDate } }) => {
  let inputTxs = new Array<ITxRow>();
  let outputTxs = new Array<ITxRow>();

  if (address) {
    // inputs
    const res = await axios.post('https://graphql.bitquery.io/', {
      "variables": {
        "limit": 10,
        "offset": 0,
        "address": address,
        "network": "flow",
        "from": startDate + "T00:00:00",
        "till": endDate + "T23:59:59",
        "dateFormat": "%Y-%m-%d"
      },
      "query": "query ($network: FlowNetwork!, $limit: Int!, $offset: Int!, $from: ISO8601DateTime, $till: ISO8601DateTime, $address: String!) {\n  flow(network: $network) {\n    inputs(options: {limit: $limit, offset: $offset, desc: \"count\"}, date: {since: $from, till: $till}, address: {is: $address}) {\n      amount(calculate: sum, address: {is: $address})\n      count: countBigInt(address: {is: $address})\n      currency {\n        address\n        symbol\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
    }, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'X-API-KEY': 'BQYR8h7uD7S8klT2q6BZoa9m1duLyA95'
      }
    });

    const post: IAccountDetailResponse = await res.data;
    post.data.flow.inputs.map((record: IAccTx, index: number) => {
      const tx: ITxRow = {
        key: index.toString(),
        symbol: record.currency.symbol,
        address: record.currency.address,
        amount: record.amount,
        count: record.count
      };
      inputTxs.push(tx);
    });

    // outputs
    const outputRes = await axios.post('https://graphql.bitquery.io/', {
      "variables": {
        "limit": 10,
        "offset": 0,
        "address": address,
        "network": "flow",
        "from": startDate + "T00:00:00",
        "till": endDate + "T23:59:59",
        "dateFormat": "%Y-%m-%d"
      },
      "query": "query ($network: FlowNetwork!, $limit: Int!, $offset: Int!, $from: ISO8601DateTime, $till: ISO8601DateTime, $address: String!) {\n  flow(network: $network) {\n    outputs(options: {limit: $limit, offset: $offset, desc: \"count\"}, date: {since: $from, till: $till}, address: {is: $address}) {\n      amount(calculate: sum, address: {is: $address})\n      count: countBigInt(address: {is: $address})\n      currency {\n        address\n        symbol\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
    }, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'X-API-KEY': 'BQYR8h7uD7S8klT2q6BZoa9m1duLyA95'
      }
    });

    const outputPost: IAccountDetailResponse = await outputRes.data;
    outputPost.data.flow.outputs.map((record: IAccTx, index: number) => {
      const tx: ITxRow = {
        key: index.toString(),
        symbol: record.currency.symbol,
        address: record.currency.address,
        amount: record.amount,
        count: record.count
      };
      outputTxs.push(tx);
    });
  }

  return {
    props: {
      inputTxs,
      outputTxs
    },
  };

};