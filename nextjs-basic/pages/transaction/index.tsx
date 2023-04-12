import { GetServerSideProps } from 'next';
import { Button, Table } from 'antd';
import React from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

interface ITransactionProps {
  txs: Array<ITxRow>;
}

interface ITxRow {
  key: string;
  timestamp: string;
  transactionId: string;
  symbol: string;
  amount: number;
}

interface ITransactionsResponse {
  data: ITransactionsData
}

interface ITransactionsData {
  flow: ITransactionsFlow
}

interface ITransactionsFlow {
  inputs: Array<ITransaction>;
  outputs: Array<ITransaction>;
}

interface ITransaction {
  amount: number;
  currency: ITxCurrency;
  time: ITxTime;
  transaction: ITx;
}

interface ITxCurrency {
  symbol: string;
}

interface ITxTime {
  time: string;
}

interface ITx {
  id: string;
}

export default function TransactionIndex({ txs }: ITransactionProps) {
  const router = useRouter();

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      render: (id: string) => <a target='blank' href={`https://explorer.bitquery.io/flow/tx/${id}`}>{`${id}`}</a>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
    },
    {
      title: 'Currency',
      dataIndex: 'symbol',
      key: 'symbol',
    }
  ];

  return (
    <div className='home-container'>
      <Button type="link" onClick={() => {router.back()}}>Back</Button><br />
      <span>Transactions:</span><br />
      <Table dataSource={txs} columns={columns} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query: { address, startDate, endDate, symbol, directionType } }) => {
  let txs = new Array<ITxRow>();
  console.log("tx", address, startDate, endDate, symbol, directionType);
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
      "query": `query ($network: FlowNetwork!, $limit: Int!, $offset: Int!, $from: ISO8601DateTime, $till: ISO8601DateTime, $address: String!) {\n  flow(network: $network) {\n    ${directionType}(options: {desc: \"time.time\", limit: $limit, offset: $offset}, date: {since: $from, till: $till}, address: {is: $address}) {\n      time {\n        time(format: \"%Y-%m-%d %H:%M:%S\")\n        __typename\n      }\n      transaction {\n        id\n        __typename\n      }\n      currency {\n        symbol\n        __typename\n      }\n      entityId\n      amount\n      smartContractMethod {\n        signature\n        __typename\n      }\n      eventIndex\n      transferReason\n      __typename\n    }\n    __typename\n  }\n}\n`
    }, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'X-API-KEY': 'BQYR8h7uD7S8klT2q6BZoa9m1duLyA95'
      }
    });

    const post: ITransactionsResponse = await res.data;
    if (directionType === "inputs") {
      post.data.flow.inputs.map((record: ITransaction, index: number) => {
        if (record.currency.symbol === symbol) {

          const tx: ITxRow = {
            key: index.toString(),
            symbol: record.currency.symbol,
            amount: record.amount,
            timestamp: record.time.time,
            transactionId: record.transaction.id
          };
          txs.push(tx);
        }
      });
    } else {
      post.data.flow.outputs.map((record: ITransaction, index: number) => {
        if (record.currency.symbol === symbol) {
          const tx: ITxRow = {
            key: index.toString(),
            symbol: record.currency.symbol,
            amount: record.amount,
            timestamp: record.time.time,
            transactionId: record.transaction.id
          };
          txs.push(tx);
        }
      });
    }
  }

  return {
    props: {
      txs
    },
  };

};