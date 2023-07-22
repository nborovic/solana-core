import { FC, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as Web3 from "@solana/web3.js";

import styles from "../styles/Home.module.css";

export const SendSolForm: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [solAmount, setSolAmount] = useState(0);
  const [recipientAddress, setRecipientAddress] = useState("");

  const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!connection || !publicKey) {
      alert("Please connect your wallet first");
      return;
    }

    let recipientPublicKey: Web3.PublicKey;

    try {
      recipientPublicKey = new Web3.PublicKey(recipientAddress);
    } catch (error) {
      alert("Recipient address is not valid");
      return;
    }

    if (!Web3.PublicKey.isOnCurve(recipientPublicKey.toBuffer())) {
      alert("Recipient address is not valid");
      return;
    }

    const lamportBalance = await connection.getBalance(publicKey);

    if (lamportBalance / Web3.LAMPORTS_PER_SOL < solAmount) {
      alert("Insufficient sol balance");
      return;
    }

    console.log(`Send ${solAmount} SOL to ${recipientAddress}`);

    const transaction = new Web3.Transaction();

    const instruction = Web3.SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: recipientPublicKey,
      lamports: solAmount * Web3.LAMPORTS_PER_SOL,
    });

    transaction.add(instruction);

    try {
      const transactionSignature = await sendTransaction(
        transaction,
        connection
      );

      console.log(
        `Explorer URL: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
      );
    } catch (error) {
      console.log(error);
      alert("Transaction failed");
    }
  };

  return (
    <div>
      <form className={styles.form}>
        <label htmlFor="amount">Amount (in SOL) to send:</label>
        <input
          id="amount"
          type="number"
          className={styles.formField}
          placeholder="e.g. 0.1"
          required
          value={solAmount}
          onChange={(event) => setSolAmount(+event.target.value)}
        />
        <br />
        <label htmlFor="recipient">Send SOL to:</label>
        <input
          id="recipient"
          type="text"
          className={styles.formField}
          placeholder="e.g. 4Zw1fXuYuJhWhu9KLEYMhiPEiqcpKd6akw3WRZCv84HA"
          required
          value={recipientAddress}
          onChange={(event) => setRecipientAddress(event.target.value)}
        />
        <button
          type="submit"
          className={styles.formButton}
          onClick={handleSubmit}>
          Send
        </button>
      </form>
    </div>
  );
};
