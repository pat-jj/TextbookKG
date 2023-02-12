import PyPDF2
import fitz
from tqdm import tqdm



def pypdf_pdf2txt():
    path = "./textbooks"
    pdf_file = open(path+"/textbook.pdf", "rb")
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in tqdm(pdf_reader.pages):
        text += page.extract_text() + "\n"
    
    out_file = open(path+"/textbook.txt", "w", encoding="utf-8")
    out_file.write(text)


def fitz_pdf2txt():
    path = "./textbooks"
    pdf_file = path+"/textbook.pdf"

    with fitz.open(pdf_file) as doc:
        text = ""
        for page in tqdm(doc):
            text += page.get_text()

    out_file = open(path+"/textbook.txt", "w", encoding="utf-8")
    out_file.write(text)


def main():
    # pypdf_pdf2txt() 
    fitz_pdf2txt()


if __name__ == "__main__":
    main()