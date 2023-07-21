import type { NextPage } from "next";
import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import * as web3 from "@solana/web3.js";

import styles from "../styles/Home.module.css";
import AddressForm from "../components/AddressForm";

const Home: NextPage = () => {
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState("");
  const [isExecutable, setIsExecutabl] = useState(false);

  const addressSubmittedHandler = async (address: string) => {
    try {
      const key = new web3.PublicKey(address);
      setAddress(key.toBase58());

      const connection = new web3.Connection(web3.clusterApiUrl("devnet"));

      const balance = await connection.getBalance(key);
      const accountInfo = await connection.getAccountInfo(key);

      if (!accountInfo) throw new Error(`Can't get account info`);

      setBalance(balance / web3.LAMPORTS_PER_SOL);
      setIsExecutabl(accountInfo?.executable);
    } catch (error) {
      setAddress("");
      setBalance(0);
      alert(error);
    }
  };

  return (
    <div className={styles.App}>
      <header className={styles.AppHeader}>
        <p>Start Your Solana Journey</p>
        <AddressForm handler={addressSubmittedHandler} />
        <p>{`Address: ${address}`}</p>
        <p>{`Balance: ${balance} SOL`}</p>
        <p>Is it executable? {isExecutable ? "Yeah" : "Nope"}</p>
      </header>
    </div>
  );
};

export default Home;
