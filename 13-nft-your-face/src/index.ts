import { initializeKeypair } from "./initializeKeypair";
import * as web3 from "@solana/web3.js";
import {
  Metaplex,
  bundlrStorage,
  keypairIdentity,
  Nft,
  toMetaplexFile,
} from "@metaplex-foundation/js";
import { readFileSync } from "fs";

const tokenName = "Chuck Norris";
const description =
  "Chuck Norris doesn't read books. He stares them down until he gets the information he wants.";
const symbol = "CHUCK";
const sellerFeeBasisPoints = 100;
const imageSrc = "assets/chuck-norris.jpg";

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const user = await initializeKeypair(connection);

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    );

  const buffer = readFileSync(imageSrc);

  const file = toMetaplexFile(buffer, "chuck-norris.jpg");

  const imageUri = await metaplex.storage().upload(file);
  console.log("image uri:", imageUri);

  const { uri } = await metaplex.nfts().uploadMetadata({
    name: tokenName,
    description,
    image: imageUri,
  });

  await createNft(metaplex, uri);
}

async function createNft(metaplex: Metaplex, uri: string): Promise<Nft> {
  const { nft } = await metaplex.nfts().create({
    uri,
    name: tokenName,
    sellerFeeBasisPoints,
    symbol,
  });

  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
  );

  return nft;
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
