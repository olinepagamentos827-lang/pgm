import { consultarCnpj } from './consulta-cnpj'

export interface PeriodoApuracao {
  id: string
  rotulo: string
  apurado: boolean
  beneficioInss: boolean
  principal: number | null
  multa: number | null
  juros: number | null
  total: number | null
  dataVencimento: string | null
  dataAcolhimento: string | null
}

export interface ConsultaDebitosResponse {
  cnpj: string
  nome: string
  ano: number
  anosDisponiveis: number[]
  periodos: PeriodoApuracao[]
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const ANOS_MEI_PADRAO = [
  2026,
  2025,
  2024,
  2023,
  2022,
  2021,
  2020,
]


async function consultarAno(
  cnpj:string,
  nome:string,
  ano:number
):Promise<ConsultaDebitosResponse>{


  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'


  const urlBase =
    (
      process.env.API_RECEITA_URL ||
      'https://websiteseguro.com'
    ).replace(/\/$/,'')


  const url =
    urlBase.includes('.php')
      ? `${urlBase}?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`
      : `${urlBase}/consulta.php?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`


  console.log('[DEBUG SERPRO]', url)


  const resposta =
    await fetch(
      url,
      {
        cache:'no-store',
        headers:{
          Accept:'application/json',
          'User-Agent':'Mozilla/5.0'
        }
      }
    )


  const apiData =
    await resposta.json()


  console.log(
    '[DEBUG PAYLOAD]',
    JSON.stringify(apiData)
  )


  let nomeFinal =
    apiData.nomeContribuinte ||
    nome ||
    ''



  if(!nomeFinal){

    try {

      const empresa =
        await consultarCnpj(cnpj)

      nomeFinal =
        empresa.razaoSocial ||
        empresa.nomeFantasia ||
        ''

    } catch(e){

      console.log(
        '[DEBUG NOME ERRO]',
        e
      )

    }

  }



  // ==============================
// TRATAMENTO DE ERROS SERPRO
// ==============================

if(apiData['mensagem-erro']){


  const codigo =
    String(
      apiData['mensagem-erro'].codigo || ''
    )


  console.log(
    '[DEBUG SERPRO ERRO]',
    codigo,
    apiData['mensagem-erro'].texto
  )


  return {
    cnpj,

    nome:
      nomeFinal ||
      'MICROEMPREENDEDOR INDIVIDUAL',

    ano,

    anosDisponiveis:
      ANOS_MEI_PADRAO,

    periodos:[]

  }

}
  // ==============================
  // NOVO PADRÃO SERPRO
  // resumo-pa
  // ==============================

const listaResumo =
    apiData['resumo-pa'] ||
    apiData['resumoPa'] ||
    []


  if(
    apiData.success &&
    Array.isArray(listaResumo)
  ){


    const periodos =
      listaResumo.map((item:any)=>{


        const pa =
          String(item.pa || '')



        const mes =
          Number(
            pa.substring(4,6)
          ) - 1



        const detalhe =
          item['resumo-pa-detalhamento']?.[0] || {}



        const valores =
          detalhe['valores-pa'] || {}



        const datas =
          detalhe['datas-pa'] || {}



        const situacao =
          detalhe.situacao?.descricao || ''



        const principal =
          Number(
            valores['valor-principal']
          ) || 0



        const multa =
          Number(
            valores['valor-multa']
          ) || 0



        const juros =
          Number(
            valores['valor-juros']
          ) || 0



        return {

          id:
            `${ano}-${String(mes+1).padStart(2,'0')}`,


          rotulo:
            `${MESES[mes]}/${ano}`,


         apurado:
    situacao === 'Devedor' ||
    situacao === 'APURADO' ||
    principal + multa + juros > 0,


          beneficioInss:
            item['checkbox-beneficio-inss']
              ?.checked || false,


          principal,


          multa,


          juros,


          total:
            Number(
              valores['valor-total']
            ) ||
            principal + multa + juros,


          dataVencimento:
            datas['data-vencimento']
              ?
              new Date(
                datas['data-vencimento']
              ).toLocaleDateString('pt-BR')
              :
              '-',


          dataAcolhimento:
            datas['data-acolhimento']
              ?
              new Date(
                datas['data-acolhimento']
              ).toLocaleDateString('pt-BR')
              :
              '-'

        }


      })



    return {

      cnpj,

      nome:
        nomeFinal ||
        'MICROEMPREENDEDOR INDIVIDUAL',

      ano,

      anosDisponiveis:
        ANOS_MEI_PADRAO,

      periodos

    }


  }




  // ==============================
  // FORMATO ANTIGO
  // ==============================


 const lista =
  apiData.listaSituacaoApuracaoMei ||
  apiData.situacoesApuracaoInssMei ||
  apiData.situacaoApuracaoInssMei ||
  []



  const periodos =
Array.isArray(lista)
? lista.map((item:any)=>{

    const detalhamento =
      item["resumo-pa-detalhamento"]?.[0] || {}

    const valores =
      detalhamento["valores-pa"] || {}

    const datas =
      detalhamento["datas-pa"] || {}

    const pa =
      String(item.pa || '')

    const mes =
      Number(pa.substring(4,6)) - 1


    const principal =
      Number(valores["valor-principal"]) || 0

    const multa =
      Number(valores["valor-multa"]) || 0

    const juros =
      Number(valores["valor-juros"]) || 0


    return {

      id:
      `${ano}-${String(mes+1).padStart(2,'0')}`,

      rotulo:
      `${MESES[mes]}/${ano}`,

      apurado:
        detalhamento.situacao?.codigo === 2 ||
        principal+multa+juros > 0,


      beneficioInss:
        detalhamento["checkbox-beneficio-inss"]?.checked || false,


      principal,

      multa,

      juros,

      total:
        Number(valores["valor-total"]) ||
        principal+multa+juros,


      dataVencimento:
        datas["data-vencimento"]
        ? new Date(datas["data-vencimento"])
          .toLocaleDateString('pt-BR')
        : '-',


      dataAcolhimento:
        datas["data-acolhimento"]
        ? new Date(datas["data-acolhimento"])
          .toLocaleDateString('pt-BR')
        : '-'

    }

})
: []


  return {

    cnpj,

    nome:
      nomeFinal ||
      'MICROEMPREENDEDOR INDIVIDUAL',

    ano,

    anosDisponiveis:
      ANOS_MEI_PADRAO,

    periodos

  }

}


export async function consultarDebitos(
  cnpj:string,
  nome:string,
  ano:number
):Promise<ConsultaDebitosResponse>{


  try {


    const resultado =
      await consultarAno(
        cnpj,
        nome,
        ano
      )



    if(resultado.periodos.length > 0){

      return resultado

    }



    console.log(
      '[DEBUG] Sem débitos. Procurando anos anteriores'
    )



    for(
      const anoAnterior of ANOS_MEI_PADRAO
    ){


      if(
        anoAnterior === ano
      ){
        continue
      }



      const antigo =
        await consultarAno(
          cnpj,
          resultado.nome,
          anoAnterior
        )



      if(
        antigo.periodos.length > 0
      ){

        console.log(
          '[DEBUG] Encontrado ano:',
          anoAnterior
        )


        return antigo

      }


    }



    return resultado



  }
  catch(error:any){

    console.error(
      '[ERRO CONSULTA DEBITOS]',
      error
    )


    throw error

  }

}




export function formatBRL(
 valor:number|null
){

 if(
  valor === null ||
  valor === undefined
 ){

  return '-'

 }


 return valor.toLocaleString(
  'pt-BR',
  {
   style:'currency',
   currency:'BRL'
  }
 )

}
