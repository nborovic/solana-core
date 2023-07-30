import { FC, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import { shuffle } from "lodash";

import styles from "../styles/custom.module.css";

export const FetchNft: FC = () => {
  const [nftData, setNftData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { connection } = useConnection();
  const wallet = useWallet();
  const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));

  useEffect(() => {
    fetchNfts();
  }, []);

  const fetchNfts = async () => {
    if (!wallet.connected) return;

    const nfts = await metaplex
      .nfts()
      .findAllByOwner({ owner: wallet.publicKey });

    const nftData = [];
    for await (const nft of shuffle(nfts).splice(0, 10)) {
      const fetchResult = await fetch(nft.uri);
      const json = await fetchResult.json();
      nftData.push(json);
    }

    setNftData(nftData);
    setIsLoading(false);
  };

  return (
    <div>
      {isLoading && "Loading..."}
      {!isLoading && nftData && (
        <div className={styles.gridNFT}>
          {nftData.map((nft) => (
            <div>
              <ul>{nft.name}</ul>
              <img src={nft.image} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
