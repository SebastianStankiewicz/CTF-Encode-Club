/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ctf_anchor.json`.
 */
export type CtfAnchor = {
  "address": "9NYLcKqUvux8fz8qxpwnEveosrZS7TG6oHn1FSPLkMjt",
  "metadata": {
    "name": "ctfAnchor",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createChallenge",
      "discriminator": [
        170,
        244,
        47,
        1,
        1,
        15,
        173,
        239
      ],
      "accounts": [
        {
          "name": "challenge",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  104,
                  97,
                  108,
                  108,
                  101,
                  110,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "challengeId"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "challengeId",
          "type": "u64"
        },
        {
          "name": "flagHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "depositLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitGuess",
      "discriminator": [
        61,
        124,
        32,
        227,
        64,
        198,
        252,
        3
      ],
      "accounts": [
        {
          "name": "challenge",
          "writable": true
        },
        {
          "name": "guesser",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "guessPlain",
          "type": "string"
        },
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "challengeData",
      "discriminator": [
        244,
        170,
        188,
        90,
        31,
        204,
        252,
        21
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "alreadySolved",
      "msg": "Challenge already solved"
    }
  ],
  "types": [
    {
      "name": "challengeData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "challengeId",
            "type": "u64"
          },
          {
            "name": "flagHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "isSolved",
            "type": "bool"
          }
        ]
      }
    }
  ]
};
