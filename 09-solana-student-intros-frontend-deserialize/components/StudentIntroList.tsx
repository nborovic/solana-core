import { Card } from "./Card";
import { FC, useEffect, useState } from "react";
import { StudentIntro } from "../models/StudentIntro";
import { useConnection } from "@solana/wallet-adapter-react";
import * as Web3 from "@solana/web3.js";

const STUDENT_INTRO_PROGRAM_ID = "HdE95RSVsdb315jfJtaykXhXY478h53X6okDupVfY9yf";

export const StudentIntroList: FC = () => {
  const { connection } = useConnection();
  const [studentIntros, setStudentIntros] = useState<StudentIntro[]>([]);

  useEffect(() => {
    (async function () {
      try {
        const accounts = await connection.getProgramAccounts(
          new Web3.PublicKey(STUDENT_INTRO_PROGRAM_ID)
        );

        const studentIntros = accounts.reduce(
          (accum: StudentIntro[], { pubkey, account }) => {
            if (!account.data) return accum;

            const studentIntro = StudentIntro.deserialize(account.data);

            if (!studentIntro) return accum;

            return [...accum, studentIntro];
          },
          []
        );

        setStudentIntros(studentIntros);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [connection]);

  return (
    <div>
      {studentIntros.map((studentIntro, i) => (
        <Card key={i} studentIntro={studentIntro} />
      ))}
    </div>
  );
};
