import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { FC, useEffect, useState } from "react";
import styles from "../styles/custom.module.css";

export const FetchCandyMachine: FC = () => {
  const [candyMachineAddress, setCandyMachineAddress] = useState("");
  const [candyMachineData, setCandyMachineData] = useState(null);
  const [pageItems, setPageItems] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const { connection } = useConnection();
  const metaplex = Metaplex.make(connection);

  useEffect(() => {
    if (!candyMachineData) {
      return;
    }
    getPage(page, 9);
  }, [candyMachineData, page]);

  const fetchCandyMachine = async () => {
    setIsLoading(true);
    setPage(1);

    try {
      const candyMachine = await metaplex
        .candyMachines()
        .findByAddress({ address: new PublicKey(candyMachineAddress) });

      setCandyMachineData(candyMachine);
    } catch (error) {
      console.log(error);
      alert("Please submit a valid CMv2 address.");
    }
    setIsLoading(false);
  };

  const getPage = async (page: number, perPage: number) => {
    setIsLoading(true);
    const pageItems = candyMachineData.items.slice(
      (page - 1) * perPage,
      page * perPage
    );

    const nftData = [];
    for await (const nft of pageItems) {
      const fetchResult = await fetch(nft.uri);
      const json = await fetchResult.json();
      nftData.push(json);
    }

    setPageItems(nftData);
    setIsLoading(false);
  };

  const prev = async () => {
    if (page - 1 < 1) {
      setPage(1);
    } else {
      setPage(page - 1);
    }
  };

  const next = async () => {
    setPage(page + 1);
  };

  return (
    <div>
      <input
        type="text"
        className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none text-center"
        placeholder="Enter Candy Machine v2 Address"
        value={candyMachineAddress}
        onChange={(e) => setCandyMachineAddress(e.target.value)}
      />
      <button
        className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
        onClick={fetchCandyMachine}>
        Fetch
      </button>

      {candyMachineData && (
        <div className="flex flex-col items-center justify-center p-5">
          <ul>Candy Machine Address: {candyMachineData.address.toString()}</ul>
        </div>
      )}

      {isLoading && "Loading..."}

      {!isLoading && pageItems && (
        <div>
          <div className={styles.gridNFT}>
            {pageItems.map((nft, index) => (
              <div key={index}>
                <ul>{nft.name}</ul>
                <img src={nft.image} />
              </div>
            ))}
          </div>
          <button
            className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
            onClick={prev}>
            Prev
          </button>
          <button
            className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
            onClick={next}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};
