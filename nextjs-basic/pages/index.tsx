import { GetServerSideProps } from 'next';
import { DatePicker, Input, Table } from 'antd';
import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
const { Search } = Input;
const { RangePicker } = DatePicker;
type RangeValue = [Dayjs | null, Dayjs | null] | null;

interface IAccountProps {
  txs: Array<ITxRow>;
}

interface ITxRow {
  key: string;
  symbol: string;
  address: string;
  amount: number;
}

interface IAccountDetailResponse {
  data: IAccData
}

interface IAccData {
  flow: IAccFlow
}

interface IAccFlow {
  inputs: Array<IAccTx>;
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

export default function Home({ txs }: IAccountProps) {
  const router = useRouter();
  const dateFormat = 'YYYY-MM-DD';

  const [inputAddress, SetInputAddress] = useState('');
  const [dates, setDates] = useState<RangeValue>(null);
  const [value, setValue] = useState<RangeValue>(null);

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
  ];

  const onSearch = (addr: string) => {
    const startDate = dayjs(dates?.[0]).format(dateFormat);
    const endDate = dayjs(dates?.[1]).format(dateFormat);
    router.push(`/?address=${addr}&startDate=${startDate}&endDate=${endDate}`);
    SetInputAddress(addr);
  }

  return (
    <div className='home-container'>
      <Search placeholder="input search text" onSearch={onSearch} />
      <RangePicker format={dateFormat} 
        onCalendarChange={(val) => setDates(val)}
        onChange={(val) => setValue(val)}/>
      <br/>
      <span>Currencies Send:</span><br/>
      <Table dataSource={txs} columns={columns} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query: { address, startDate, endDate } }) => {
  let txs = new Array<ITxRow>();
  if (address) {
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
        amount: record.amount
      };
      txs.push(tx);
    });
    
    const wrapper: IAccountProps = {
      txs: txs
    };
  }

  return {
    props: {
      txs,
    },
  };

};