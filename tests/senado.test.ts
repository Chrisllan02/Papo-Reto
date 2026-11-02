import { describe, expect, it } from 'vitest';
import { asArray, parseSenadoresList } from '../domain/legislative/senado';

const senator = (telefone: unknown, suplente: unknown) => ({
  IdentificacaoParlamentar: {
    CodigoParlamentar: '5672',
    NomeParlamentar: 'ALAN RICK',
    SiglaPartidoParlamentar: 'REPUBLICANOS',
    UfParlamentar: 'AC',
    SexoParlamentar: 'Masculino',
    Telefones: { Telefone: telefone },
  },
  Mandato: { Suplentes: { Suplente: suplente } },
});

const wrap = (parlamentar: unknown) => ({ ListaParlamentarEmExercicio: { Parlamentares: { Parlamentar: parlamentar } } });

describe('parseSenadoresList', () => {
  it('lê o mesmo senador quando o Senado devolve objeto único ou lista', () => {
    const asObjects = parseSenadoresList(wrap(senator({ NumeroTelefone: '33036333' }, { DescricaoParticipacao: '1º Suplente', NomeParlamentar: 'Gemil Junior' })));
    const asArrays = parseSenadoresList(wrap([senator([{ NumeroTelefone: '33036333' }], [{ DescricaoParticipacao: '1º Suplente', NomeParlamentar: 'Gemil Junior' }])]));

    expect(asObjects).toEqual(asArrays);
    expect(asObjects).toHaveLength(1);
    expect(asObjects[0]).toMatchObject({ id: 5672, role: 'Senador', cabinet: { phone: '33036333' }, suplentes: ['1º Suplente - Gemil Junior'] });
  });

  it('devolve lista vazia para resposta sem parlamentares ou malformada', () => {
    expect(parseSenadoresList(null)).toEqual([]);
    expect(parseSenadoresList({ ListaParlamentarEmExercicio: {} })).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
  });
});
