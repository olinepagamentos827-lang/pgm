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


  console.log(
    '[DEBUG SERPRO]',
    url
  )


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



    if(!nomeFinal){

      const empresa =
        await consultarCnpj(cnpj)

      nomeFinal =
        empresa.razaoSocial ||
        empresa.nomeFantasia ||
        ''

    }


    if(codigo === '23033'){

      return {
        cnpj,
        nome:nomeFinal,
        ano,
        anosDisponiveis:ANOS_MEI_PADRAO,
        periodos:[]
      }

    }


    return {
      cnpj,
      nome:nomeFinal || 'MICROEMPREENDEDOR INDIVIDUAL',
      ano,
      anosDisponiveis:ANOS_MEI_PADRAO,
      periodos:[]
    }

  }



  const lista =
    apiData.listaSituacaoApuracaoMei ||
    apiData.situacoesApuracaoInssMei ||
    apiData.situacaoApuracaoInssMei ||
    []



  const periodos =
    Array.isArray(lista)
      ? lista.map((item:any)=>{


          let mes = 0


          const periodo =
            String(
              item.periodoApuracao || ''
            )


          if(periodo.includes('/')){

            mes =
              Number(periodo.split('/')[0])-1

          }
          else if(periodo.length === 6){

            mes =
              Number(periodo.substring(4,6))-1

          }


          if(mes < 0 || mes > 11 || isNaN(mes)){
            mes = 0
          }


          const principal =
            Number(item.valorPrincipal) || 0


          const multa =
            Number(item.valorMulta) || 0


          const juros =
            Number(item.valorJuros) || 0



          return {

            id:
              `${ano}-${String(mes+1).padStart(2,'0')}`,

            rotulo:
              `${MESES[mes]}/${ano}`,

            apurado:
              item.situacaoApuracao === 'APURADO' ||
              item.situacaoApuracao === 'DEVEDOR' ||
              principal + multa + juros > 0,

            beneficioInss:false,

            principal,

            multa,

            juros,

            total:
              principal+multa+juros,

            dataVencimento:
              item.dataVencimento || '-',

            dataAcolhimento:
              new Date().toLocaleDateString('pt-BR')

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



    if(
      resultado.periodos.length > 0
    ){

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
