import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { Account } from "../types";

const END_BLOCK = 910674;
const BRIDGE_ACCOUNT = "22b8PtaXYXt7NvrY355Ry2NzeCNNVTARrFpGPPjXRWJnPvPU";

async function getOrCreateAccount(address: string) {
  const account = await Account.get(address);

  if (account) {
    return account;
  } else {
    const newAccount = Account.create({
      id: address,
      dexCallsCount: 0,
      ausdMintEventsCount: 0,
      dotBridgeUseCount: 0,
    });

    await newAccount.save();

    return newAccount;
  }
}

export async function handleDexCall(
  extrinsic: SubstrateExtrinsic
): Promise<void> {
  const blockNum = extrinsic.block.block.header.number.toBigInt();

  if (blockNum > END_BLOCK) {
    return;
  }
  const caller = extrinsic.extrinsic.signer.toString();

  const account = await getOrCreateAccount(caller);
  account.dexCallsCount += 1;

  await account.save();
}

export async function handlePositionUpdateEvent(
  event: SubstrateEvent
): Promise<void> {
  const blockNum = event.block.block.header.number.toBigInt();

  if (blockNum > END_BLOCK) {
    return;
  }

  const {
    event: {
      data: [owner, _currencyId, _collateral, debit],
    },
  } = event;

  const account = await getOrCreateAccount(owner.toString());

  const debitAdjustment = Number(debit.toString());

  if (debitAdjustment > 0) {
    account.ausdMintEventsCount += 1;

    await account.save();
  }
}

export async function handleDotBridgeEvent(
  event: SubstrateEvent
): Promise<void> {
  const blockNum = event.block.block.header.number.toBigInt();

  if (blockNum > END_BLOCK) {
    return;
  }

  const {
    event: {
      data: [_currencyId, from, to, _amount],
    },
  } = event;

  if (from.toString() !== BRIDGE_ACCOUNT) {
    return;
  }

  const account = await getOrCreateAccount(to.toString());

  account.dotBridgeUseCount += 1;

  await account.save();
}
