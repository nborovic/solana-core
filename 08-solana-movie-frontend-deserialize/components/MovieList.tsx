import { Card } from "./Card";
import { FC, useEffect, useState } from "react";
import { Movie } from "../models/Movie";
import { useConnection } from "@solana/wallet-adapter-react";
import * as Web3 from "@solana/web3.js";

const MOVIE_REVIEW_PROGRAM_ID = "CenYq6bDRB7p73EjsPEpiYN7uveyPUTdXkDkgUduboaN";

export const MovieList: FC = () => {
  const { connection } = useConnection();
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    (async function () {
      try {
        const accounts = await connection.getProgramAccounts(
          new Web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID)
        );

        const movies: Movie[] = accounts.reduce(
          (accum: Movie[], { pubkey, account }) => {
            if (!account.data) return accum;

            const movie = Movie.deserialize(account.data);

            if (!movie) return accum;

            return [...accum, movie];
          },
          []
        );

        setMovies(movies);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [connection]);

  return (
    <div>
      {movies.map((movie, i) => {
        return <Card key={i} movie={movie} />;
      })}
    </div>
  );
};
