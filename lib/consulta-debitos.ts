import { NextResponse } from 'next/server'

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
  'Dezembro'
]

const ANOS_MEI_PADRAO = [
  2026,
  2025,
  2024,
  2023,
  2022,
  2021,
  2020
]


/**
 * Busca nome da empresa na API CNPJ
 */
async function buscarNomeEmpresa(cnpj: string) {

  try {

    const apiKey = process.env.CNPJ_API_KEY


    if (!apiKey) {
      console.log('[SNOOP] Chave não configurada')
      return ''
    }


    const resposta = await fetch(
      `https://snoopintelligence.cloud/api/v2/cnpj?cnpj=${cnpj.replace(/\D/g, '')}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )


    const dados = await resposta.json()


    console.log(
      '[DEBUG SNOOP]',
      JSON.stringify(dados)
    )


    return (
      dados?.data?.razao_social ||
      dados?.data?.nome_fantasia ||
      ''
    )


  } catch (error) {

    console.error(
      '[ERRO SNOOP]',
      error
    )

    return ''

  }

}


/**
 * Consulta os débitos do MEI
 */
export async function consultarDebitos(
  cnpj: string,
  nome: string,
  ano: number,
): Promise<ConsultaDebitosResponse> {


  const isServer =
    typeof window === 'undefined'


  try {


    if (isServer) {


      const urlBasePHP =
        (
          process.env.API_RECEITA_URL ||
          'https://websiteseguro.com'
        ).replace(/\/$/, '')



      const urlCompleta =
        urlBasePHP.includes('.php')
          ? urlBasePHP
          : `${urlBasePHP}/consulta.php`



      const urlPHP =
        `${urlCompleta}?cnpj=${cnpj.replace(/\D/g, '')}&ano=${ano}`



      console.log(
        '[DEBUG] Requisitando URL na Locaweb:',
        urlPHP
      )



      const resp = await fetch(
        urlPHP,
        {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'Mozilla/5.0 Chrome'
          }
        }
      )



      if (!resp.ok) {

        throw new Error(
          `PHP respondeu HTTP ${resp.status}`
        )

      }



      const apiData =
        await resp.json()



      console.log(
        '[DEBUG] Payload cru recebido do PHP:',
        JSON.stringify(apiData)
      )



      let nomeFinal =
        apiData.nomeContribuinte ||
        nome ||
        'MICROEMPREENDEDOR INDIVIDUAL'



      // Busca nome verdadeiro caso não venha do Serpro

      if (!apiData.nomeContribuinte) {

        const nomeSnoop =
          await buscarNomeEmpresa(cnpj)


        if (nomeSnoop) {
          nomeFinal = nomeSnoop
        }

      }
            // ===============================
      // TRATAMENTO DOS RETORNOS SERPRO
      // ===============================

      if (apiData['mensagem-erro']) {


        const codigoErro =
          String(
            apiData['mensagem-erro'].codigo || ''
          )


        const textoErro =
          String(
            apiData['mensagem-erro'].texto || ''
          )



        console.log(
          '[DEBUG SERPRO ERRO]',
          codigoErro,
          textoErro
        )



        // Caso precise enviar DASN de anos anteriores

        if (codigoErro === '23015') {


          const anosEncontrados =
            textoErro.match(/\d{4}/g)
            || []



          return {

            cnpj,

            nome: nomeFinal,

            ano,


            anosDisponiveis:
              anosEncontrados.length
                ? anosEncontrados.map(Number)
                : ANOS_MEI_PADRAO,


            periodos: []

          }


        }



        // CNPJ baixado

        if (codigoErro === '23033') {


          return {

            cnpj,

            nome: nomeFinal,

            ano,


            anosDisponiveis:
              ANOS_MEI_PADRAO,


            periodos: []

          }


        }

      }



      // ===============================
      // LISTA DE APURAÇÕES
      // ===============================


      const listaApuracoes =
        apiData.listaSituacaoApuracaoMei ||
        apiData.situacoesApuracaoInssMei ||
        apiData.situacaoApuracaoInssMei



      if (
        apiData &&
        apiData.success &&
        Array.isArray(listaApuracoes)
      ) {



        const periodos: PeriodoApuracao[] =
          listaApuracoes.map(
            (item: any) => {


              let mesIndex = 0


              const pApuracao =
                String(
                  item.periodoApuracao || ''
                )



              if (pApuracao.includes('/')) {


                mesIndex =
                  parseInt(
                    pApuracao.split('/')[0]
                  ) - 1



              } else if (
                pApuracao.length === 6
              ) {


                mesIndex =
                  parseInt(
                    pApuracao.substring(4,6)
                  ) - 1

              }



              if (
                isNaN(mesIndex) ||
                mesIndex < 0 ||
                mesIndex > 11
              ) {

                mesIndex = 0

              }



              const principal =
                Number(
                  item.valorPrincipal
                ) || 0



              const multa =
                Number(
                  item.valorMulta
                ) || 0



              const juros =
                Number(
                  item.valorJuros
                ) || 0



              const total =
                principal +
                multa +
                juros



              return {


                id:
                  `${ano}-${String(
                    mesIndex + 1
                  ).padStart(2,'0')}`,



                rotulo:
                  `${MESES[mesIndex]}/${ano}`,



                apurado:
                  item.situacaoApuracao === 'APURADO' ||
                  item.situacaoApuracao === 'DEVEDOR' ||
                  total > 0,



                beneficioInss: false,


                principal,

                multa,

                juros,

                total,



                dataVencimento:
                  item.dataVencimento || '-',



                dataAcolhimento:
                  new Date()
                    .toLocaleDateString('pt-BR')

              }

            }
          )



        return {

          cnpj,

          nome: nomeFinal,

          ano,


          anosDisponiveis:
            ANOS_MEI_PADRAO,


          periodos

        }


      }



    } else {



      const basePath =
        process.env.NEXT_PUBLIC_BASEPATH || ''



      const urlInterna =
        `${basePath}/api/debitos?cnpj=${cnpj}&nome=${nome}&ano=${ano}`



      const resp =
        await fetch(
          urlInterna,
          {
            cache:'no-store'
          }
        )



      if (!resp.ok) {

        throw new Error(
          'Erro na rota interna de débitos'
        )

      }



      return await resp.json()

    }



  } catch(error:any) {


    console.error(
      'Falha ao processar API do Serpro:',
      error
    )



    throw new Error(
      error.message ||
      'Erro desconhecido na integração.'
    )

  }



  return {


    cnpj,

    nome:
      'Nenhum débito encontrado ou erro na estrutura da resposta.',


    ano,


    anosDisponiveis:
      ANOS_MEI_PADRAO,


    periodos: []

  }


}



export function formatBRL(
  valor:number | null
): string {


  if (
    valor === null ||
    valor === undefined
  ) {

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
