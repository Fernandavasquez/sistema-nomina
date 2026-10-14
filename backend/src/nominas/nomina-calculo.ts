import { TipoConcepto } from '../common/enums.js';
import { round2 } from '../common/utils/money.js';
import { ConceptoNomina } from '../conceptos-nomina/entities/concepto-nomina.entity.js';

export interface LineaNomina {
  monto: number;
  concepto: Pick<ConceptoNomina, 'tipo'>;
}

/** Percepciones suman, deducciones restan: líquido = percepciones − deducciones. */
export function calcularTotales(lineas: LineaNomina[]) {
  let percepciones = 0;
  let deducciones = 0;
  for (const linea of lineas) {
    if (linea.concepto.tipo === TipoConcepto.PERCEPCION) percepciones += linea.monto;
    else deducciones += linea.monto;
  }
  return {
    totalPercepciones: round2(percepciones),
    totalDeducciones: round2(deducciones),
    liquidoRecibir: round2(percepciones - deducciones),
  };
}
