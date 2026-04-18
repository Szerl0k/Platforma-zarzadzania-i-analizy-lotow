import { ValueTransformer } from "typeorm";

export const HexIcao24AddressTransformer: ValueTransformer = {
    from: (value: number): string => {
        return value.toString(16).padStart(6, '0');
    },
    to: (value: string | number) : number => {
        if (typeof value === 'number') return value;
        return parseInt(value.replace(/^0x/, ''), 16);
    }

}