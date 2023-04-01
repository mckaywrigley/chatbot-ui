import { Disclosure } from '@headlessui/react'
import { MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline'

const faqs = [
  {
    question: "HoiGPT là gì?",
    answer:
      "Hỏi GPT (Hoigpt) là một dự án phi lợi nhuận, giúp người dùng ở Việt Nam tiếp cận với mô hình trí tuệ nhân tạo hàng đầu hiện nay, dùng nó để hỗ trợ vào những việc có ích.",
  },
  {
    question: "Tôi có thể biết thêm thông tin hay hỗ trợ dự án ở đâu?",
    answer:
      "Bạn có thể theo dõi Fanpage HoiGPT trên Facebook để biết thêm thông tin, hỗ trợ dự án, hoặc đóng góp ý kiến cho dự án. Fanpage: https://www.facebook.com/hoiGPT/"
  },
  {
    question: "Tại sao lại là GPT?",
    answer:
      "GPT là một mô hình trí tuệ nhân tạo (ngôn ngữ tự nhiên) được OpenAI phát triển. GPT được huấn luyện trên hàng tỷ từ vựng, văn bản, câu hỏi, gần như mọi thông tin có trên Internet; từ đó có thể hiểu ngữ nghĩa thông thường và trả lời các câu hỏi.",
  },
  {
    question: "HoiGPT sẽ được truy cập miễn phí đến khi nào?",
    answer:
      "HoiGPT sẽ được duy trì miễn phí lâu nhất có thể, để mọi người ai cũng có thể tiếp cận. Tuy nhiên, nếu bạn muốn hỗ trợ dự án, bạn có thể ủng hộ HoiGPT bằng cách đóng góp cho dự án, hoặc đơn giản là chia sẻ HoiGPT.com cho bạn bè, người thân.",
  },
  {
    question: "Giới hạn độ tuổi của người dùng là bao nhiêu?",
    answer:
      "HoiGPT hay GPT nói chung, được giới hạn để sử dụng cho người từ 13 tuổi trở lên, trường hợp người dưới 18 tuổi, phải có sự cho phép và theo dõi của người lớn. Vì HoiGPT là một dự án phi lợi nhuận, nên chúng tôi không chịu trách nhiệm về những hậu quả pháp lý có thể xảy ra do việc sử dụng HoiGPT của người dùng. Tìm hiểu thêm tại: https://www.openai.com/terms/",
  },
  {
    question: "GPT có thể làm được những gì?",
    answer:
      "GPT có thể hiểu ngữ nghĩa thông thường thông qua văn bản được nhận, từ đó có thể trả lời các câu hỏi, hỗ trợ học tập, lập trình, đưa ra gợi ý, ...",
  },
  {
    question: "Tôi không nên dùng GPT cho những việc gì?",
    answer:
      "GPT nhìn chung vẫn là một công cụ để hỗ trợ con người, bạn không nên dùng nó để thay thế con người. Vì vậy, bạn không nên dùng GPT để giải quyết các vấn đề có tính chất đặc thù, như: tư vấn pháp lý, tư vấn y tế, ... Đồng thời, không nên dùng nội dung từ GPT để chia sẻ, đăng tải, phát hành, bán hàng, ... Nếu phải chia sẻ, vui lòng nhấn mạnh rằng đó là kết quả của GPT, để người khác nhận biết. Thông tin thật hay giả là một vấn đề nhức nhối, mỗi người nên có ý thức tiêu thụ thông tin."
  },
  {
    question: "Tôi nên dùng GPT cho những việc gì?",
    answer:
      "GPT có thể giúp bạn tiết kiệm thời gian và công sức trong việc tìm kiếm, tổng hợp thông tin, học tập, lập trình, sáng tạo, ...",
  },
  {
    question: "Tôi cần lưu ý gì khi dùng GPT?",
    answer:
      "Dù vẫn đang được phát triển và cải tiến liên tục, bạn không nên kỳ vọng GPT thông minh như một người bình thường. GPT không thể hiểu được ngữ nghĩa của các từ vựng đặc thù, từ đó có thể dẫn đến những kết quả không mong muốn. Vì vậy, bạn nên dùng GPT để hỗ trợ công việc của mình, không nên dùng nó để thay thế công việc của mình.",
  },
  // More questions...
]

export default function About() {
  return (
    <div className="bg-gray-900">
      <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            HoiGPT.com - GPT cho người Việt
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            Cầu nối giúp bạn tiếp cận GPT và tận dụng lợi thế của nó trong công việc và cuộc sống.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="https://openai.com/product/gpt-4"
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Về GPT-4
            </a>
            <a href="https://www.facebook.com/hoiGPT" className="text-sm font-semibold leading-6 text-white">
              Fanpage HoiGPT <span aria-hidden="true">→</span>
            </a>
          </div>
          <svg
            viewBox="0 0 1024 1024"
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
            aria-hidden="true"
          >
            <circle cx={512} cy={512} r={512} fill="url(#827591b1-ce8c-4110-b064-7cb85a0b1217)" fillOpacity="0.7" />
            <defs>
              <radialGradient id="827591b1-ce8c-4110-b064-7cb85a0b1217">
                <stop stopColor="#7775D6" />
                <stop offset={1} stopColor="#E935C1" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-4xl divide-y divide-white/10">
          <h2 className="text-2xl font-bold leading-10 tracking-tight text-white">Câu hỏi thường gặp:</h2>
          <dl className="mt-10 space-y-6 divide-y divide-white/10">
            {faqs.map((faq) => (
              <Disclosure as="div" key={faq.question} className="pt-6">
                {({ open }) => (
                  <>
                    <dt>
                      <Disclosure.Button className="flex w-full items-start justify-between text-left text-white">
                        <span className="text-base font-semibold leading-7">{faq.question}</span>
                        <span className="ml-6 flex h-7 items-center">
                          {open ? (
                            <MinusSmallIcon className="h-6 w-6" aria-hidden="true" />
                          ) : (
                            <PlusSmallIcon className="h-6 w-6" aria-hidden="true" />
                          )}
                        </span>
                      </Disclosure.Button>
                    </dt>
                    <Disclosure.Panel as="dd" className="mt-2 pr-12">
                      <p className="text-base leading-7 text-gray-300">{faq.answer}</p>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
